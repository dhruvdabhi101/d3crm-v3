import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { billingConfigured, stripeRequest, verifyStripeSignature } from "@/lib/billing";
import { readText, RequestError } from "@/lib/security";

export async function POST(request: Request) {
  if (!billingConfigured()) return NextResponse.json({ error: "Billing is unavailable." }, { status: 503 });
  let text;
  try { text = await readText(request, 256 * 1024); } catch (error) { if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status }); throw error; }
  if (!verifyStripeSignature(text, request.headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET!)) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  let input;
  try { input = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid event." }, { status: 400 }); }
  const parsed = z.object({ id: z.string().startsWith("evt_"), type: z.string(), data: z.object({ object: z.object({ id: z.string(), customer: z.string().optional() }) }) }).safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const event = parsed.data;
  if (!["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) return NextResponse.json({ received: true });
  const organization = event.data.object.customer ? await db.organization.findUnique({ where: { stripeCustomerId: event.data.object.customer } }) : null;
  if (!organization) return NextResponse.json({ received: true });
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organization.id} FOR UPDATE`;
    if (await tx.stripeEvent.findUnique({ where: { id: event.id } })) return;
    const subscription = await stripeRequest<{ id: string; customer: string; status: string; items: { data: { price: { id: string } }[] } }>(`subscriptions/${encodeURIComponent(event.data.object.id)}`);
    if (subscription.customer !== organization.stripeCustomerId) throw new Error("Subscription customer mismatch.");
    const active = ["active", "trialing"].includes(subscription.status) && subscription.items.data.some(item => item.price.id === process.env.STRIPE_PRO_PRICE_ID);
    const current = await tx.organization.findUniqueOrThrow({ where: { id: organization.id } });
    if (current.stripeSubscriptionId && current.stripeSubscriptionId !== subscription.id && !active) {
      await tx.stripeEvent.create({ data: { id: event.id } });
      return;
    }
    await tx.organization.update({ where: { id: organization.id }, data: { plan: active ? "PRO" : "FREE", stripeSubscriptionId: ["canceled", "incomplete_expired"].includes(subscription.status) ? null : subscription.id, subscriptionStatus: subscription.status } });
    await tx.stripeEvent.create({ data: { id: event.id } });
  }, { timeout: 20_000 });
  return NextResponse.json({ received: true });
}
