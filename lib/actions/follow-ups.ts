"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { bulkSaveLeads } from "@/lib/lead-workflow";
import { RequestError } from "@/lib/request-error";

export type FollowUpState = { error?: string; success?: string; updatedAt?: string };

export async function updateFollowUp(id: string, _state: FollowUpState, formData: FormData): Promise<FollowUpState> {
  const { organization, user } = await requireRole(Role.MEMBER);
  const clear = formData.get("intent") === "clear";
  const value = clear ? "" : String(formData.get("followUpAt") ?? "");
  if (!clear && !value) return { error: "Choose a date, or clear the follow-up." };
  try {
    await rateLimit("lead-followup", user.id, 120, 3600);
    const saved = await db.$transaction(async tx => {
      await bulkSaveLeads(tx, organization.id, user.id, {
        items: [{ id, updatedAt: String(formData.get("updatedAt") ?? "") }],
        change: { kind: "followup", value },
      });
      const lead = await tx.submission.findFirst({ where: { id, form: { organizationId: organization.id } }, select: { updatedAt: true } });
      if (!lead) throw new RequestError("Enquiry not found.", 404);
      return lead.updatedAt.toISOString();
    });
    revalidatePath("/follow-ups");
    revalidatePath("/submissions");
    revalidatePath("/submissions/[id]", "page");
    revalidatePath("/forms/[id]", "page");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/clients");
    revalidatePath("/activity");
    return { success: clear ? "Follow-up cleared." : "Follow-up rescheduled.", updatedAt: saved };
  } catch (error) {
    if (error instanceof RequestError) return { error: error.message };
    throw error;
  }
}
