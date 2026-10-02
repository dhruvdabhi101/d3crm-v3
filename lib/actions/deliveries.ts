"use server";
import { Role } from "@prisma/client";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { processDeliveries } from "@/lib/deliveries";
export async function retryDelivery(id: string, state: { error?: string; success?: string }): Promise<{ error?: string; success?: string }> {
  void state;
  const { organization, user } = await requireRole(Role.ADMIN);
  await rateLimit("retry-delivery", user.id, 30, 3600);
  const job = await db.outboundDelivery.findFirst({ where: { id, form: { organizationId: organization.id }, status: "FAILED" } });
  if (!job) return { error: "Failed delivery not found." };
  await db.outboundDelivery.updateMany({ where: { id, status: "FAILED" }, data: { status: "PENDING", attempts: 0, nextAttemptAt: new Date(), leaseUntil: null } });
  after(async () => { await processDeliveries([id]); }); revalidatePath(`/forms/${job.formId}`);
  return { success: "Retry queued." };
}
