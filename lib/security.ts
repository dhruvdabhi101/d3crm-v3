import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

export function appUrl() {
  if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) throw new Error("Configure NEXTAUTH_URL in production.");
  const url = new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("NEXTAUTH_URL must use HTTPS in production.");
  return url.origin;
}

export function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value || value.length < 32 || value.startsWith("replace-with")) throw new Error("Configure a strong NEXTAUTH_SECRET (at least 32 characters).");
  return value;
}

export function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken() { return randomBytes(32).toString("base64url"); }

export function encrypt(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(secret()).digest(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function decrypt(value: string) {
  const bytes = Buffer.from(value, "base64url");
  const cipher = createDecipheriv("aes-256-gcm", createHash("sha256").update(secret()).digest(), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function webhookSignature(body: string, timestamp: string, key: string) {
  return createHmac("sha256", key).update(`${timestamp}.${body}`).digest("hex");
}

export function validPassword(value: string) {
  return value.length >= 8 && Buffer.byteLength(value, "utf8") <= 72;
}

export class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function readText(request: Request, limit = 64 * 1024) {
  if (Number(request.headers.get("content-length")) > limit) throw new RequestError("Payload is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) { await reader.cancel(); throw new RequestError("Payload is too large.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}

export async function readJson(request: Request, limit?: number): Promise<unknown> {
  const text = await readText(request, limit);
  try { return JSON.parse(text); } catch { throw new RequestError("Submit valid JSON.", 400); }
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== appUrl()) throw new RequestError("This origin is not allowed.", 403);
}

export function requestIp(headers: Headers | Record<string, string | string[] | undefined>) {
  const get = (name: string) => headers instanceof Headers ? headers.get(name) : headers[name];
  const name = process.env.TRUSTED_IP_HEADER;
  // Only trust a header the deployment proxy overwrites; no header means a shared IP bucket.
  const value = name ? get(name.toLowerCase()) : null;
  const ip = Array.isArray(value) ? value[0] : value?.split(",")[0]?.trim();
  return ip && isIP(ip) ? ip : "unknown";
}

export function rateKey(scope: string, value: string) {
  return createHmac("sha256", secret()).update(`${scope}:${value}`).digest("hex");
}

export function publicIPv4(ip: string) {
  if (isIP(ip) !== 4) return false;
  const [a, b, c] = ip.split(".").map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
}

export function webhookUrl(value: string) {
  if (value.length > 2000) throw new Error("Webhook URL is too long.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
    isIP(url.hostname) || !url.hostname.includes(".") || url.hostname.endsWith(".") || /(?:^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) {
    throw new Error("Use a public HTTPS webhook URL on port 443.");
  }
  return url.toString();
}

export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
