import { createHash, createHmac, randomBytes } from "node:crypto";

export function createFormKey() {
  const key = `d3f_${randomBytes(24).toString("base64url")}`;
  return { key, prefix: key.slice(0, 12), hash: hashFormKey(key) };
}

export function hashFormKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function hashIp(ip: string) {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "development-only")
    .update(ip)
    .digest("hex");
}
