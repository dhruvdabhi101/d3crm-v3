"use server";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { LEAD_STATUSES } from "@/lib/leads";
import { rateLimit } from "@/lib/rate-limit";

export type SubmissionState = { error?: string; success?: string };
export async function updateSubmission(id: string, _state: SubmissionState, formData: FormData): Promise<SubmissionState> {
  const { organization } = await requireRole(Role.MEMBER);
  const status = String(formData.get("status"));
  if (!LEAD_STATUSES.includes(status as typeof LEAD_STATUSES[number])) return { error: "Choose a valid status." };
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  if (assigneeId && !await db.organizationMember.findFirst({ where: { organizationId: organization.id, userId: assigneeId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } } })) return { error: "Choose a workspace team member." };
  const date = String(formData.get("followUpAt") ?? "");
  const followUpAt = date ? new Date(`${date}T00:00:00.000Z`) : null;
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !followUpAt || isNaN(followUpAt.getTime()) || followUpAt.toISOString().slice(0, 10) !== date)) return { error: "Choose a valid follow-up date." };
  const updatedAt = new Date(String(formData.get("updatedAt")));
  if (isNaN(updatedAt.getTime())) return { error: "Reload the enquiry and try again." };
  const previous = await db.submission.findFirst({ where: { id, form: { organizationId: organization.id } }, select: { followUpAt: true } });
  const result = await db.submission.updateMany({ where: { id, form: { organizationId: organization.id }, updatedAt }, data: { status: status as typeof LEAD_STATUSES[number], assigneeId, followUpAt, ...(previous?.followUpAt?.getTime() !== followUpAt?.getTime() ? { followUpNotifiedAt: null } : {}), readAt: formData.get("unread") === "on" ? null : new Date() } });
  if (!result.count) return { error: "This enquiry changed or was removed. Reload before saving." };
  revalidatePath(`/submissions/${id}`); revalidatePath("/submissions"); revalidatePath("/dashboard");
  return { success: "Enquiry updated." };
}

export async function addSubmissionNote(id: string, _state: SubmissionState, formData: FormData): Promise<SubmissionState> {
  const { organization, user } = await requireRole(Role.MEMBER);
  const body = String(formData.get("body") ?? "").trim();
  if (!body || body.length > 5000) return { error: "Use between 1 and 5,000 characters." };
  await rateLimit("lead-note", user.id, 60, 3600);
  const submission = await db.submission.findFirst({ where: { id, form: { organizationId: organization.id } }, select: { id: true } });
  if (!submission) return { error: "Enquiry not found." };
  await db.submissionNote.create({ data: { submissionId: id, authorId: user.id, body } });
  revalidatePath(`/submissions/${id}`);
  return { success: "Note added." };
}

export async function deleteSubmission(id: string) {
  const { organization } = await requireRole(Role.ADMIN);
  await db.submission.deleteMany({ where: { id, form: { organizationId: organization.id } } });
  revalidatePath("/submissions"); revalidatePath("/dashboard");
}
