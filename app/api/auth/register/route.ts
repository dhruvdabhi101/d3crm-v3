import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { toSlug } from "@/lib/slug";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  organization: z.string().trim().min(2).max(100),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check your details and try again." }, { status: 400 });
  const existing = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const baseSlug = toSlug(parsed.data.organization) || "workspace";
  const organizationSlug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
  const passwordHash = await hash(parsed.data.password, 12);

  await db.user.create({
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

  return NextResponse.json({ ok: true }, { status: 201 });
}
