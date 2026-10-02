import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { toSlug } from "@/lib/slug";
import { queueAccountToken } from "@/lib/account";
import { mailConfigured, processDeliveries } from "@/lib/deliveries";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, requestIp, requireSameOrigin, RequestError, validPassword } from "@/lib/security";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().refine(validPassword, "Use at least 8 characters and at most 72 bytes."),
  organization: z.string().trim().min(2).max(100),
});

export async function POST(request: Request) {
  let body;
  try {
    requireSameOrigin(request);
    await rateLimit("register-ip", requestIp(request.headers), 10, 3600);
    body = await readJson(request, 8192);
    if (process.env.NODE_ENV === "production" && !mailConfigured()) throw new RequestError("Account email delivery is not configured.", 503);
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check your details and try again." }, { status: 400 });
  const existing = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const baseSlug = toSlug(parsed.data.organization) || "workspace";
  const organizationSlug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
  const passwordHash = await hash(parsed.data.password, 12);

  try {
    await db.$transaction(async tx => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            organization: { create: { name: parsed.data.organization, slug: organizationSlug } },
          },
        },
      },
    });
    if (mailConfigured()) await queueAccountToken(tx, user, "VERIFY_EMAIL");
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existingOrganization = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Organization" WHERE lower(btrim(name)) = lower(${parsed.data.organization}) LIMIT 1`;
      return NextResponse.json({ error: existingOrganization.length ? "An organization with that name already exists." : "An account with this email already exists." }, { status: 409 });
    }
    throw error;
  }

  if (mailConfigured()) after(async () => { await processDeliveries(); });
  return NextResponse.json({ ok: true }, { status: 201 });
}
