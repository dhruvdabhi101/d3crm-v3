import type { Prisma, TokenPurpose } from "@prisma/client";
import { appUrl, randomToken, tokenHash } from "./security.ts";
import { mailJob } from "./deliveries.ts";

export async function queueAccountToken(tx: Prisma.TransactionClient, user: { id: string; email: string }, purpose: TokenPurpose) {
  const token = randomToken();
  const hashed = tokenHash(token);
  const expiresAt = new Date(Date.now() + (purpose === "RESET_PASSWORD" ? 30 * 60_000 : 24 * 3600_000));
  await tx.accountToken.upsert({ where: { userId_purpose: { userId: user.id, purpose } }, create: { userId: user.id, purpose, tokenHash: hashed, expiresAt }, update: { tokenHash: hashed, expiresAt } });
  const reset = purpose === "RESET_PASSWORD";
  await tx.outboundDelivery.create({ data: mailJob(user.email, reset ? "Reset your d3CRM password" : "Verify your d3CRM email", `${reset ? "Reset your password" : "Verify your email address"}:\n${appUrl()}/${reset ? "reset-password" : "verify-email"}?token=${token}\n\nThis link expires in ${reset ? "30 minutes" : "24 hours"}. If you did not request this, ignore this email.`, hashed) });
}
