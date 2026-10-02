import assert from "node:assert/strict";
import { test } from "node:test";
import { callbackPath } from "../navigation.ts";
import { csvCell, decrypt, encrypt, publicIPv4, readJson, readText, requestIp, safeEqual, validPassword, webhookSignature, webhookUrl } from "../security.ts";

process.env.NEXTAUTH_SECRET = "test-only-secret-at-least-32-characters";

test("bounded parsing rejects oversized streams and invalid JSON", async () => {
  await assert.rejects(() => readText(new Request("https://example.com", { method: "POST", body: "a".repeat(100) }), 10), { status: 413 });
  await assert.rejects(() => readJson(new Request("https://example.com", { method: "POST", body: "{" })), { status: 400 });
  assert.deepEqual(await readJson(new Request("https://example.com", { method: "POST", body: '{"ok":true}' })), { ok: true });
});

test("passwords respect bcrypt byte limits", () => {
  assert.equal(validPassword("abcdefgh"), true);
  assert.equal(validPassword("a".repeat(73)), false);
  assert.equal(validPassword("😀".repeat(19)), false);
});

test("private, reserved and non-IPv4 webhook addresses are rejected", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.1.1", "172.31.2.3", "192.168.1.1", "169.254.169.254", "100.64.0.1", "198.18.0.1", "192.0.0.1", "203.0.113.1", "224.0.0.1", "0.0.0.0", "::1", "::ffff:127.0.0.1"]) assert.equal(publicIPv4(ip), false, ip);
  assert.equal(publicIPv4("8.8.8.8"), true);
  for (const url of ["http://example.com", "https://localhost", "https://127.0.0.1", "https://user:pass@example.com", "https://example.com:8080", "https://site.internal", "https://[::1]"]) assert.throws(() => webhookUrl(url));
  assert.equal(webhookUrl("https://example.com/hook"), "https://example.com/hook");
});

test("encryption detects tampering and signatures bind the body", () => {
  const encrypted = encrypt("sensitive-token");
  assert.equal(decrypt(encrypted), "sensitive-token");
  const bytes = Buffer.from(encrypted, "base64url"); bytes[30] ^= 1;
  assert.throws(() => decrypt(bytes.toString("base64url")));
  assert.notEqual(webhookSignature("a", "123", "secret"), webhookSignature("b", "123", "secret"));
  assert.equal(safeEqual("token", "token"), true); assert.equal(safeEqual("token", "tokens"), false);
});

test("forwarded IP headers are ignored unless explicitly trusted", () => {
  delete process.env.TRUSTED_IP_HEADER;
  assert.equal(requestIp(new Headers({ "x-forwarded-for": "8.8.8.8" })), "unknown");
  process.env.TRUSTED_IP_HEADER = "x-real-ip";
  assert.equal(requestIp(new Headers({ "x-real-ip": "8.8.8.8" })), "8.8.8.8");
  assert.equal(requestIp(new Headers({ "x-real-ip": "invalid" })), "unknown");
  delete process.env.TRUSTED_IP_HEADER;
});

test("CSV cells neutralize formulas even after whitespace", () => {
  for (const value of ["=SUM(A1)", " +cmd", "\t=1", "\n@cmd", "-10"]) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('a"b'), '"a""b"');
});

test("callback URLs cannot leave the application", () => {
  for (const path of ["https://evil.com", "//evil.com", "/\\evil.com"]) assert.equal(callbackPath(`callbackUrl=${encodeURIComponent(path)}`), "/dashboard");
  assert.equal(callbackPath("callbackUrl=%2Finvitations%3Ftoken%3Dtest"), "/invitations?token=test");
});
