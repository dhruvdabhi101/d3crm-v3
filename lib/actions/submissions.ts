"use server";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { LEAD_STATUSES } from "@/lib/leads";
import { rateLimit } from "@/lib/rate-limit";
import { addLeadNote, removeLead, saveLead } from "@/lib/lead-workflow";
import { RequestError } from "@/lib/security";
import { followUpDate } from "@/lib/inbox-filters";

export type SubmissionState = { error?: string; success?: string; updatedAt?: string };
export async function updateSubmission(id: string, _state: SubmissionState, formData: FormData): Promise<SubmissionState> {
  const { organization, user } = await requireRole(Role.MEMBER);
  const status = String(formData.get("status"));
  if (!LEAD_STATUSES.includes(status as typeof LEAD_STATUSES[number])) return { error: "Choose a valid status." };
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  if (assigneeId && !await db.organizationMember.findFirst({ where: { organizationId: organization.id, userId: assigneeId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } } })) return { error: "Choose a workspace team member." };
  const date = String(formData.get("followUpAt") ?? "");
  let followUpAt: Date | null;
  try { followUpAt = followUpDate(date); } catch { return { error: "Choose a valid follow-up date." }; }
  const updatedAt = new Date(String(formData.get("updatedAt")));
  if (isNaN(updatedAt.getTime())) return { error: "Reload the enquiry and try again." };
  let savedVersion: string;
  try {
    savedVersion = await db.$transaction(async tx => {
      await saveLead(tx, organization.id, user.id, id, { status: status as typeof LEAD_STATUSES[number], assigneeId, followUpAt, updatedAt, unread: formData.get("unread") === "on" });
      const saved = await tx.submission.findFirstOrThrow({ where: { id, form: { organizationId: organization.id } }, select: { updatedAt: true } });
      return saved.updatedAt.toISOString();
    });
  }
  catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath(`/submissions/${id}`); revalidatePath("/submissions"); revalidatePath("/dashboard"); revalidatePath("/follow-ups"); revalidatePath("/reports"); revalidatePath("/clients");
  return { success: "Enquiry updated.", updatedAt: savedVersion };
}

export async function addSubmissionNote(id: string, _state: SubmissionState, formData: FormData): Promise<SubmissionState> {
  const { organization, user } = await requireRole(Role.MEMBER);
  const body = String(formData.get("body") ?? "").trim();
  if (!body || body.length > 5000) return { error: "Use between 1 and 5,000 characters." };
  await rateLimit("lead-note", user.id, 60, 3600);
  try { await db.$transaction(tx => addLeadNote(tx, organization.id, user.id, id, body)); }
  catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath(`/submissions/${id}`);
  return { success: "Note added." };
}

export async function deleteSubmission(id: string) {
  const { organization, user } = await requireRole(Role.ADMIN);
  await db.$transaction(tx => removeLead(tx, organization.id, user.id, id));
  revalidatePath("/submissions"); revalidatePath("/dashboard"); revalidatePath("/follow-ups"); revalidatePath("/reports"); revalidatePath("/clients");
}
