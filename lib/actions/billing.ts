"use server";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { billingConfigured, checkoutParams, stripeRequest } from "@/lib/billing";
import { appUrl } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export async function openBilling(_state: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const { organization, user } = await requireRole(Role.OWNER);
  if (!billingConfigured()) return { error: "Subscription billing is unavailable. Contact the administrator." };
  if (!user.emailVerifiedAt) return { error: "Verify your email before opening billing." };
  await rateLimit("billing-owner", user.id, 10, 3600);
  let url;
  try {
    url = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organization.id} FOR UPDATE`;
      const current = await tx.organization.findUniqueOrThrow({ where: { id: organization.id } });
      const owner = await tx.organizationMember.findFirst({ where: { organizationId: organization.id, userId: user.id, role: "OWNER" } });
      if (!owner) throw new Error("Only the current owner can manage billing.");
      let customer = current.stripeCustomerId;
      if (!customer) {
        const created = await stripeRequest<{ id: string }>("customers", new URLSearchParams({ email: user.email, name: current.name, "metadata[organizationId]": current.id }), `customer-${current.id}`);
        customer = created.id;
        await tx.organization.update({ where: { id: current.id }, data: { stripeCustomerId: customer } });
      }
      if (formData.get("portal") === "on" || current.stripeSubscriptionId) {
        return (await stripeRequest<{ url: string }>("billing_portal/sessions", new URLSearchParams({ customer, return_url: `${appUrl()}/settings` }))).url;
      }
      if (current.stripeCheckoutId) {
        const existing = await stripeRequest<{ status: string; url: string | null }>(`checkout/sessions/${encodeURIComponent(current.stripeCheckoutId)}`);
        if (existing.status === "open" && existing.url) return existing.url;
      }
      const checkout = await stripeRequest<{ id: string; url: string }>("checkout/sessions", checkoutParams(customer, current.id), `checkout-${current.id}-${current.stripeCheckoutId ?? "first"}`);
      await tx.organization.update({ where: { id: current.id }, data: { stripeCheckoutId: checkout.id } });
      return checkout.url;
    }, { timeout: 30_000 });
  } catch (error) { return { error: error instanceof Error ? error.message : "Could not open billing." }; }
  if (!url || !["checkout.stripe.com", "billing.stripe.com"].includes(new URL(url).hostname)) return { error: "Could not open billing." };
  redirect(url);
}
