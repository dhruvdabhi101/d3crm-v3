import type { Prisma } from "@prisma/client";
import { Resolver } from "node:dns/promises";
import { request } from "node:https";
import { db } from "./db.ts";
import { appUrl, decrypt, encrypt, publicIPv4, webhookSignature, webhookUrl } from "./security.ts";
const resolver = new Resolver({ timeout: 2000, tries: 1 });

export function mailConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM); }

type Mail = { to: string; subject: string; text: string; tokenHash?: string };

export function mailJob(to: string, subject: string, text: string, tokenHash?: string, formId?: string): Prisma.OutboundDeliveryCreateManyInput {
  return { kind: "EMAIL", formId, payload: { encrypted: encrypt(JSON.stringify({ to, subject, text, tokenHash })) } };
}

async function sendWebhook(urlInput: string, body: string, signature: string, deliveryId: string) {
  const url = new URL(webhookUrl(urlInput));
  const addresses = await resolver.resolve4(url.hostname);
  if (!addresses.length || addresses.some(address => !publicIPv4(address))) throw new Error("Webhook destination is not public.");
  // Pin the checked address to this connection; redirects and DNS rebinding cannot reach internal services.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { req.destroy(new Error("Webhook timed out.")); }, 8000);
    const req = request(url, {
      method: "POST", agent: false, family: 4,
      lookup: (_hostname, _options, callback) => callback(null, addresses[0], 4),
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "X-D3-Signature": signature, "X-D3-Delivery": deliveryId },
    }, response => {
      clearTimeout(timer);
      const status = response.statusCode ?? 500;
      response.destroy();
      if (status >= 200 && status < 300) resolve();
      else reject(new Error(`Webhook returned HTTP ${status}.`));
    });
    req.on("error", error => { clearTimeout(timer); reject(error); });
    req.end(body);
  });
}

export async function processDeliveries(ids?: string[]) {
  const now = new Date();
  const jobs = await db.outboundDelivery.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }], ...(ids ? { id: { in: ids } } : {}) },
    orderBy: { createdAt: "asc" }, take: 10,
  });
  let sent = 0;
  for (const job of jobs) {
    const leaseUntil = new Date(Date.now() + 60_000);
    const claimed = await db.outboundDelivery.updateMany({ where: { id: job.id, status: "PENDING", nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseUntil, attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try {
      let skipped = false;
      if (job.kind === "EMAIL") {
        const { encrypted } = job.payload as { encrypted: string };
        const mail = JSON.parse(decrypt(encrypted)) as Mail;
        let active = true;
        if (mail.tokenHash) active = Boolean(await db.accountToken.findFirst({ where: { tokenHash: mail.tokenHash, expiresAt: { gt: new Date() } } }) || await db.invitation.findFirst({ where: { tokenHash: mail.tokenHash, expiresAt: { gt: new Date() } } }));
        if (job.formId) active = Boolean(await db.form.findFirst({ where: { id: job.formId, notificationEmails: { has: mail.to }, organization: { members: { some: { user: { email: mail.to, emailVerifiedAt: { not: null } } } } } } }));
        if (active) {
          if (!mailConfigured()) throw new Error("Email delivery is not configured.");
          const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": job.id }, body: JSON.stringify({ from: process.env.MAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text }), signal: AbortSignal.timeout(8000) });
          if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}.`);
        } else skipped = true;
      } else {
        const form = job.formId ? await db.form.findUnique({ where: { id: job.formId }, select: { webhookUrl: true, webhookSecret: true } }) : null;
        const payload = job.payload as { url: string; event: Prisma.JsonValue };
        if (form?.webhookUrl && form.webhookSecret && form.webhookUrl === payload.url) {
          const body = JSON.stringify(payload.event);
          const timestamp = String(Math.floor(Date.now() / 1000));
          await sendWebhook(form.webhookUrl, body, `t=${timestamp},v1=${webhookSignature(body, timestamp, decrypt(form.webhookSecret))}`, job.id);
        } else skipped = true;
      }
      await db.outboundDelivery.updateMany({ where: { id: job.id, leaseUntil }, data: { status: skipped ? "SKIPPED" : "SENT", sentAt: skipped ? null : new Date(), leaseUntil: null, lastError: skipped ? "Destination disabled, expired, or no longer authorized." : null, ...(job.kind === "EMAIL" ? { payload: {} } : {}) } });
      if (!skipped) sent++;
    } catch (error) {
      const attempts = job.attempts + 1;
      await db.outboundDelivery.updateMany({ where: { id: job.id, leaseUntil }, data: { leaseUntil: null, status: attempts >= 5 ? "FAILED" : "PENDING", nextAttemptAt: new Date(Date.now() + 30_000 * 2 ** attempts), lastError: error instanceof Error ? error.message.slice(0, 200) : "Delivery failed." } });
    }
  }
  return { processed: jobs.length, sent };
}

export function leadEmail(formName: string, submissionId: string) {
  return { subject: `New enquiry: ${formName}`, text: `A new enquiry arrived for ${formName}.\n\nOpen it in d3CRM:\n${appUrl()}/submissions/${submissionId}\n` };
}
