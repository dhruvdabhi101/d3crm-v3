import { hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { queueAccountToken } from "@/lib/account";
import { mailConfigured, processDeliveries } from "@/lib/deliveries";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, requireSameOrigin, requestIp, RequestError, tokenHash, validPassword } from "@/lib/security";

const emailSchema = z.string().trim().email().max(254).transform(value => value.toLowerCase());
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    requireSameOrigin(request);
    const { action } = await params;
    if (!["reset-request", "reset-password", "verify-email", "verification-request"].includes(action)) return NextResponse.json({ error: "Not found." }, { status: 404 });
    await rateLimit(`account-${action}`, requestIp(request.headers), 15, 900);
    const input = await readJson(request, 8192);
    const body = z.object({ email: emailSchema.optional(), token: tokenSchema.optional(), password: z.string().max(128).optional() }).safeParse(input);
    if (!body.success) throw new RequestError("Check your details and try again.", 400);
    if (action === "reset-request" || action === "verification-request") {
      if (!mailConfigured()) throw new RequestError("Email delivery is not configured. Contact the administrator.", 503);
      let user;
      if (action === "verification-request") {
        const session = await getServerSession(authOptions);
        if (!session?.user.id) throw new RequestError("Sign in to continue.", 401);
        user = await db.user.findUnique({ where: { id: session.user.id } });
        if (!user || user.sessionVersion !== session.user.sessionVersion) throw new RequestError("Sign in again to continue.", 401);
        if (user.emailVerifiedAt) return NextResponse.json({ message: "Your email is already verified." });
      } else {
        if (!body.data.email) throw new RequestError("Enter an email address.", 400);
        await rateLimit("reset-email", body.data.email, 3, 3600);
        user = await db.user.findUnique({ where: { email: body.data.email } });
      }
      if (user) {
        await rateLimit(`token-user-${action}`, user.id, 3, 3600);
        await db.$transaction(tx => queueAccountToken(tx, user, action === "reset-request" ? "RESET_PASSWORD" : "VERIFY_EMAIL"));
        after(async () => { await processDeliveries(); });
      }
      return NextResponse.json({ message: "If the account can receive this email, a link will arrive shortly." });
    }
    if (!body.data.token) throw new RequestError("This link is invalid or expired.", 400);
    const purpose = action === "reset-password" ? "RESET_PASSWORD" : "VERIFY_EMAIL";
    if (action === "reset-password" && (!body.data.password || !validPassword(body.data.password))) throw new RequestError("Use at least 8 characters and at most 72 bytes for your password.", 400);
    const passwordHash = action === "reset-password" ? await hash(body.data.password!, 12) : undefined;
    await db.$transaction(async tx => {
      const token = await tx.accountToken.findUnique({ where: { tokenHash: tokenHash(body.data.token!) } });
      if (!token || token.purpose !== purpose || token.expiresAt <= new Date()) throw new RequestError("This link is invalid or expired.", 400);
      const consumed = await tx.accountToken.deleteMany({ where: { id: token.id, tokenHash: token.tokenHash, expiresAt: { gt: new Date() } } });
      if (!consumed.count) throw new RequestError("This link is invalid or expired.", 400);
      await tx.user.update({ where: { id: token.userId }, data: passwordHash ? { passwordHash, sessionVersion: { increment: 1 } } : { emailVerifiedAt: new Date() } });
      if (passwordHash) await tx.accountToken.deleteMany({ where: { userId: token.userId } });
    });
    return NextResponse.json({ message: action === "reset-password" ? "Password changed. Sign in with your new password." : "Your email is verified." });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status, headers: error.status === 429 ? { "Retry-After": "900" } : {} });
    throw error;
  }
}
