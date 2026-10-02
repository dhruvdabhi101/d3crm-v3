import { db } from "./db.ts";
import { rateKey, RequestError } from "./security.ts";

export async function rateLimit(scope: string, value: string, limit: number, seconds: number) {
  const key = rateKey(scope, value);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" (key, count, "expiresAt") VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN 1 ELSE "RateLimit".count + 1 END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE "RateLimit"."expiresAt" END
    RETURNING count`;
  if (rows[0].count > limit) throw new RequestError("Too many attempts. Try again later.", 429);
}
