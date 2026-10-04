import assert from "node:assert/strict";
import { hash, compare } from "bcryptjs";
import { db } from "../lib/db.ts";
import { createFormKey } from "../lib/keys.ts";
import { rateLimit } from "../lib/rate-limit.ts";
import { decrypt, encrypt, randomToken, tokenHash } from "../lib/security.ts";
import { mailJob, processDeliveries } from "../lib/deliveries.ts";
import { checkQuota, verifyStripeSignature } from "../lib/billing.ts";
import { webhookSignature } from "../lib/security.ts";
import { addLeadNote, removeLead, saveLead } from "../lib/lead-workflow.ts";
import { leadReport, reportRange } from "../lib/reports.ts";

const base = process.env.NEXTAUTH_URL!;
const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test") || !["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Integration checks require a local test database and server.");
const suffix = randomToken().slice(0, 10).toLowerCase();
const userIds: string[] = []; const orgIds: string[] = []; const jobIds: string[] = [];

class Client {
  cookies = new Map<string, string>();
  async fetch(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("Cookie", [...this.cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    const response = await fetch(`${base}${path}`, { ...init, headers, redirect: "manual" });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";"); const index = pair.indexOf("="); this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    return response;
  }
  async login(email: string, password: string) {
    const csrf = await (await this.fetch("/api/auth/csrf")).json();
    const response = await this.fetch("/api/auth/callback/credentials", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: base }, body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, callbackUrl: `${base}/dashboard`, json: "true" }) });
    assert.equal(response.status, 200);
    assert.ok(this.cookies.has("next-auth.session-token"), "Login must issue a session");
  }
  async post(path: string, body: unknown) {
    return this.fetch(path, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }
}

async function fixture(name: string, role: "OWNER" | "VIEWER" = "OWNER", organizationId?: string) {
  const user = await db.user.create({ data: { name, email: `${name.toLowerCase()}-${suffix}@example.test`, passwordHash: await hash("IntegrationPassword2026!", 12), emailVerifiedAt: new Date() } }); userIds.push(user.id);
  const org = organizationId ? null : await db.organization.create({ data: { name: `${name} ${suffix}`, slug: `${name.toLowerCase()}-${suffix}` } });
  if (org) orgIds.push(org.id);
  await db.organizationMember.create({ data: { userId: user.id, organizationId: organizationId ?? org!.id, role } });
  return { user, organizationId: organizationId ?? org!.id };
}

try {
  const owner = await fixture("Owner"); const outsider = await fixture("Outsider");
  const ownerClient = new Client(); const outsiderClient = new Client(); const anonymous = new Client();
  await ownerClient.login(owner.user.email, "IntegrationPassword2026!");
  await outsiderClient.login(outsider.user.email, "IntegrationPassword2026!");
  const key = createFormKey();
  const schema = { version: 1, fields: [{ id: "name", label: "Original name", type: "text", required: true }, { id: "email", label: "Email", type: "email", required: true }, { id: "message", label: "Message", type: "textarea", required: true, maxLength: 1000 }] };
  const form = await db.form.create({ data: { name: "Integration enquiries", slug: `integration-${suffix}`, organizationId: owner.organizationId, schema, keyHash: key.hash, keyPrefix: key.prefix, notificationEmails: [owner.user.email], allowedOrigins: ["https://allowed.example"] } });
  const submit = (data: unknown, origin = "https://allowed.example", formKey = key.key) => fetch(`${base}/api/v1/forms/${form.slug}/submissions`, { method: "POST", headers: { Origin: origin, "X-Form-Key": formKey, "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const payload = { name: "Test enquiry", email: "lead@example.test", message: " =HYPERLINK(\"example\")" };
  assert.equal((await submit(payload, "https://evil.example")).status, 403);
  assert.equal((await submit(payload, undefined, "invalid")).status, 404);
  assert.equal((await submit({ ...payload, email: "bad" })).status, 422);
  assert.equal((await submit({ ...payload, message: "   " })).status, 422);
  assert.equal((await submit({ ...payload, _gotcha: "bot" })).status, 202);
  assert.equal(await db.submission.count({ where: { formId: form.id } }), 0);
  assert.equal((await submit({ ...payload, message: "x".repeat(70_000) })).status, 413);
  assert.equal((await submit({ ...payload, _context: { landing_page: "javascript:alert(1)" } })).status, 422);
  const accepted = await submit({ ...payload, _context: { landing_page: "https://allowed.example/contact?token=private&utm_source=Google", utm_source: "Google", utm_medium: "CPC", utm_campaign: "Studio launch" } }); assert.equal(accepted.status, 201);
  const lead = (await accepted.json()).submission;
  const saved = await db.submission.findUniqueOrThrow({ where: { id: lead.id } });
  assert.deepEqual(saved.schemaSnapshot, schema);
  assert.deepEqual(saved.attribution, { landing_page: "https://allowed.example/contact", utm_source: "google", utm_medium: "cpc", utm_campaign: "Studio launch" });
  assert.equal(await db.activity.count({ where: { submissionId: lead.id, action: "lead.created" } }), 1);
  assert.ok(!Object.keys(saved.data as object).includes("_context"));
  assert.equal(await db.outboundDelivery.count({ where: { submissionId: lead.id } }), 1);
  console.log("PASS submission validation, origins, honeypot, payload limits, durable alerts");

  const state = { status: "CONTACTED" as const, assigneeId: owner.user.id, followUpAt: new Date(Date.now() - 86400_000), updatedAt: saved.updatedAt, unread: false };
  await assert.rejects(() => db.$transaction(tx => saveLead(tx, outsider.organizationId, outsider.user.id, lead.id, state)), { status: 404 });
  const changes = await Promise.allSettled([db.$transaction(tx => saveLead(tx, owner.organizationId, owner.user.id, lead.id, state)), db.$transaction(tx => saveLead(tx, owner.organizationId, owner.user.id, lead.id, state))]);
  assert.equal(changes.filter(change => change.status === "fulfilled").length, 1);
  const contacted = await db.submission.findUniqueOrThrow({ where: { id: lead.id } });
  assert.ok(contacted.firstContactedAt);
  assert.equal(await db.activity.count({ where: { submissionId: lead.id, action: "lead.updated" } }), 1);
  await db.$transaction(tx => saveLead(tx, owner.organizationId, owner.user.id, lead.id, { ...state, status: "WON", updatedAt: contacted.updatedAt }));
  assert.equal((await db.submission.findUniqueOrThrow({ where: { id: lead.id } })).firstContactedAt!.getTime(), contacted.firstContactedAt.getTime());
  await db.$transaction(tx => addLeadNote(tx, owner.organizationId, owner.user.id, lead.id, "Private note must stay out of audit metadata."));
  const activity = await db.activity.findMany({ where: { submissionId: lead.id } });
  assert.ok(!JSON.stringify(activity).includes("Private note") && !JSON.stringify(activity).includes("lead@example.test"));
  const range = reportRange();
  const report = await leadReport(owner.organizationId, range);
  assert.equal(report.totals.total, 1); assert.equal(report.totals.won, 1); assert.equal(report.totals.contacted, 1);
  assert.equal(report.sources[0].source, "google"); assert.equal(report.forms[0].id, form.id);
  assert.equal((await leadReport(outsider.organizationId, range, form.id)).totals.total, 0);
  const viewer = await fixture("Viewer", "VIEWER", owner.organizationId); const viewerClient = new Client();
  await viewerClient.login(viewer.user.email, "IntegrationPassword2026!");
  const viewerActivity = await viewerClient.fetch("/activity"); const viewerActivityBody = await viewerActivity.text();
  assert.ok(viewerActivity.status === 307 || viewerActivityBody.includes("NEXT_REDIRECT;replace;/dashboard;307;"));
  assert.ok(!viewerActivityBody.includes("Enquiry received"));
  assert.equal((await viewerClient.fetch("/reports")).status, 200);
  assert.equal((await outsiderClient.fetch(`/reports?form=${form.id}`)).status, 200);
  const outsideActivity = await outsiderClient.fetch("/activity");
  assert.ok(!(await outsideActivity.text()).includes("Enquiry received"));
  const reportPage = await ownerClient.fetch("/reports"); assert.equal(reportPage.status, 200); assert.ok((await reportPage.text()).includes("google"));
  console.log("PASS atomic activity history, contact timestamps, tenant-scoped reports and audit permissions");

  await db.form.update({ where: { id: form.id }, data: { schema: { version: 1, fields: [{ id: "company", label: "Company", type: "text", required: true }] }, schemaVersion: { increment: 1 } } });
  const oldDetail = await ownerClient.fetch(`/submissions/${lead.id}`); assert.equal(oldDetail.status, 200); assert.ok((await oldDetail.text()).includes("Original name"));
  const formPage = await ownerClient.fetch(`/forms/${form.id}`); const formBody = await formPage.text(); assert.ok(formBody.includes("Original name") && formBody.includes("Test enquiry"));
  const dashboard = await ownerClient.fetch("/dashboard"); assert.ok((await dashboard.text()).includes(`/submissions/${lead.id}`));
  const deniedDetail = await outsiderClient.fetch(`/submissions/${lead.id}`);
  const deniedBody = await deniedDetail.text();
  assert.ok(deniedBody.includes("This page could not be found."));
  assert.ok(!deniedBody.includes("Original name") && !deniedBody.includes("Test enquiry"));
  assert.equal((await outsiderClient.fetch(`/api/forms/${form.id}/export`)).status, 404);
  const exported = await ownerClient.fetch(`/api/forms/${form.id}/export`); assert.equal(exported.status, 200); const csv = await exported.text(); assert.ok(csv.includes('"name"')); assert.ok(csv.includes('"company"')); assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('"_context.utm_source"') && csv.includes('"google"'));
  assert.equal(await db.activity.count({ where: { organizationId: owner.organizationId, action: "form.exported" } }), 1);
  assert.equal((await anonymous.fetch("/submissions")).status, 307);
  console.log("PASS workspace isolation, historical schemas, safe CSV exports");

  const attempts = await Promise.allSettled(Array.from({ length: 30 }, () => rateLimit(`concurrent-${suffix}`, "same-client", 10, 60)));
  assert.equal(attempts.filter(result => result.status === "fulfilled").length, 10);
  console.log("PASS concurrent rate limits allow exactly the configured number");

  const invalidOrigin = await fetch(`${base}/api/auth/register`, { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" }, body: "{}" }); assert.equal(invalidOrigin.status, 403);
  const oversizedAuth = await fetch(`${base}/api/auth/callback/credentials`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "x".repeat(9000) }); assert.equal(oversizedAuth.status, 413);
  const verify = randomToken();
  await db.accountToken.create({ data: { userId: owner.user.id, purpose: "VERIFY_EMAIL", tokenHash: tokenHash(verify), expiresAt: new Date(Date.now() + 60_000) } });
  const verificationResponses = await Promise.all([ownerClient.post("/api/account/verify-email", { token: verify }), ownerClient.post("/api/account/verify-email", { token: verify })]);
  assert.deepEqual(verificationResponses.map(response => response.status).sort(), [200, 400]);
  const expired = randomToken();
  await db.accountToken.create({ data: { userId: owner.user.id, purpose: "RESET_PASSWORD", tokenHash: tokenHash(expired), expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await anonymous.post("/api/account/reset-password", { token: expired, password: "NewPassword2026!" })).status, 400);
  const reset = randomToken();
  await db.accountToken.update({ where: { userId_purpose: { userId: owner.user.id, purpose: "RESET_PASSWORD" } }, data: { tokenHash: tokenHash(reset), expiresAt: new Date(Date.now() + 60_000) } });
  assert.equal((await anonymous.post("/api/account/reset-password", { token: reset, password: "NewPassword2026!" })).status, 200);
  assert.equal((await anonymous.post("/api/account/reset-password", { token: reset, password: "AnotherPassword2026!" })).status, 400);
  assert.equal((await ownerClient.fetch("/submissions")).status, 307);
  const updatedUser = await db.user.findUniqueOrThrow({ where: { id: owner.user.id } }); assert.equal(updatedUser.sessionVersion, 1); assert.equal(await compare("NewPassword2026!", updatedUser.passwordHash), true);
  console.log("PASS authentication body limits, single-use links, expiry, session invalidation");

  const workerClient = new Client();
  assert.equal((await workerClient.post("/api/jobs/deliveries", {})).status, 401);
  await db.$transaction(tx => removeLead(tx, owner.organizationId, owner.user.id, lead.id));
  assert.equal(await db.outboundDelivery.count({ where: { submissionId: lead.id } }), 0);
  assert.equal((await db.organization.findUniqueOrThrow({ where: { id: owner.organizationId } })).monthlySubmissions, 1);
  assert.equal(await db.activity.count({ where: { organizationId: owner.organizationId, action: "lead.deleted", subjectId: lead.id, submissionId: null } }), 1);
  assert.equal(await db.activity.count({ where: { organizationId: owner.organizationId, subjectId: lead.id, submissionId: null } }), 5);
  console.log("PASS worker authentication and deletion of queued enquiry data");

  const originalFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = "test-only"; process.env.MAIL_FROM = "test@example.test";
  const job = await db.outboundDelivery.create({ data: mailJob(owner.user.email, "Integration mail", "Test only") }); jobIds.push(job.id);
  let sends = 0;
  globalThis.fetch = async () => { sends++; return new Response("", { status: sends === 1 ? 503 : 200 }); };
  try {
    await processDeliveries([job.id]);
    const pending = await db.outboundDelivery.findUniqueOrThrow({ where: { id: job.id } }); assert.equal(pending.status, "PENDING"); assert.equal(pending.attempts, 1); assert.ok(pending.nextAttemptAt > new Date());
    await db.outboundDelivery.update({ where: { id: job.id }, data: { nextAttemptAt: new Date(0) } });
    await Promise.all([processDeliveries([job.id]), processDeliveries([job.id])]);
    assert.equal(sends, 2); assert.equal((await db.outboundDelivery.findUniqueOrThrow({ where: { id: job.id } })).status, "SENT");
  } finally { globalThis.fetch = originalFetch; delete process.env.RESEND_API_KEY; delete process.env.MAIL_FROM; }
  const unsafeWebhook = await db.form.create({ data: { name: "Unsafe hook", slug: `unsafe-${suffix}`, organizationId: owner.organizationId, schema, keyHash: tokenHash(randomToken()), keyPrefix: "test", webhookUrl: "https://localhost/hook", webhookSecret: encrypt(randomToken()) } });
  const hookJob = await db.outboundDelivery.create({ data: { kind: "WEBHOOK", formId: unsafeWebhook.id, payload: { url: "https://localhost/hook", event: {} } } });
  await processDeliveries([hookJob.id]); assert.equal((await db.outboundDelivery.findUniqueOrThrow({ where: { id: hookJob.id } })).status, "PENDING");
  console.log("PASS delivery retry, exclusive worker claims, SSRF rejection");
  await db.form.update({ where: { id: form.id }, data: { notificationEmails: [] } });
  const disabledMail = await db.outboundDelivery.create({ data: mailJob(owner.user.email, "Disabled alert", "Should not send", undefined, form.id) });
  const skipped = await processDeliveries([disabledMail.id]);
  assert.equal(skipped.sent, 0);
  assert.equal((await db.outboundDelivery.findUniqueOrThrow({ where: { id: disabledMail.id } })).status, "SKIPPED");
  console.log("PASS disabled notifications are recorded as skipped, not sent");

  const timestamp = String(Math.floor(Date.now() / 1000)); const body = '{"id":"evt_test"}'; const signature = webhookSignature(body, timestamp, "webhook-secret");
  assert.equal(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, "webhook-secret"), true);
  assert.equal(verifyStripeSignature(body + " ", `t=${timestamp},v1=${signature}`, "webhook-secret"), false);
  assert.equal(verifyStripeSignature(body, `t=1,v1=${signature}`, "webhook-secret"), false);
  process.env.BILLING_ENABLED = "true"; process.env.STRIPE_SECRET_KEY = "test"; process.env.STRIPE_WEBHOOK_SECRET = "test"; process.env.STRIPE_PRO_PRICE_ID = "price_test"; process.env.FREE_FORM_LIMIT = "2";
  await assert.rejects(() => db.$transaction(tx => checkQuota(tx, owner.organizationId, "forms")), { status: 429 });
  delete process.env.BILLING_ENABLED; delete process.env.STRIPE_SECRET_KEY; delete process.env.STRIPE_WEBHOOK_SECRET; delete process.env.STRIPE_PRO_PRICE_ID; delete process.env.FREE_FORM_LIMIT;
  assert.equal(decrypt(encrypt("secret")), "secret");
  console.log("PASS billing signatures, replay window and quota enforcement");
} finally {
  await db.outboundDelivery.deleteMany({ where: { id: { in: jobIds } } });
  await db.organization.deleteMany({ where: { id: { in: orgIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.$disconnect();
}
