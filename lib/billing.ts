import type { Organization, Prisma } from "@prisma/client";
import { appUrl, RequestError, safeEqual, webhookSignature } from "./security.ts";

export function billingConfigured() {
  return process.env.BILLING_ENABLED === "true" && Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRO_PRICE_ID);
}

function positiveLimit(value: string | undefined, fallback: number) {
  const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

export function planLimits(plan: "FREE" | "PRO") {
  return plan === "PRO" ? { forms: positiveLimit(process.env.PRO_FORM_LIMIT, 50), submissions: positiveLimit(process.env.PRO_SUBMISSION_LIMIT, 5000) } : { forms: positiveLimit(process.env.FREE_FORM_LIMIT, 3), submissions: positiveLimit(process.env.FREE_SUBMISSION_LIMIT, 100) };
}

export function monthStart() { const now = new Date(); return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); }

export async function checkQuota(tx: Prisma.TransactionClient, organizationId: string, kind: "forms" | "submissions") {
  if (kind === "forms" && !billingConfigured()) return;
  const organizations = await tx.$queryRaw<Organization[]>`SELECT * FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  const organization = organizations[0];
  if (!organization) throw new Error("Workspace not found.");
  const limit = planLimits(organization.plan)[kind];
  const start = monthStart();
  const sameMonth = organization.usageMonth >= start;
  const count = kind === "forms" ? await tx.form.count({ where: { organizationId, status: { not: "ARCHIVED" } } }) : sameMonth ? organization.monthlySubmissions : 0;
  if (billingConfigured() && count >= limit) throw new RequestError(kind === "forms" ? "Your form limit is reached. Archive a form or upgrade in Settings." : "This workspace has reached its monthly submission limit.", 429);
  // Reserve usage in the submission transaction; deletion must not refund accepted submissions.
  if (kind === "submissions") await tx.organization.update({ where: { id: organizationId }, data: { usageMonth: start, monthlySubmissions: count + 1 } });
}

export async function stripeRequest<T>(path: string, params?: URLSearchParams, idempotencyKey?: string): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: params ? "POST" : "GET",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: params, signal: AbortSignal.timeout(8000), cache: "no-store",
  });
  if (!response.ok) throw new Error("Billing provider is unavailable. Please try again.");
  return response.json() as Promise<T>;
}

export function verifyStripeSignature(body: string, header: string, secret: string, now = Date.now()) {
  const parts = header.split(",").map(part => part.split("="));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = webhookSignature(body, timestamp, secret);
  return parts.some(([key, value]) => key === "v1" && Boolean(value) && safeEqual(value, expected));
}

export function checkoutParams(customer: string, organizationId: string) {
  return new URLSearchParams({ mode: "subscription", customer, "line_items[0][price]": process.env.STRIPE_PRO_PRICE_ID!, "line_items[0][quantity]": "1", "subscription_data[metadata][organizationId]": organizationId, client_reference_id: organizationId, success_url: `${appUrl()}/settings?billing=success`, cancel_url: `${appUrl()}/settings?billing=cancelled` });
}
