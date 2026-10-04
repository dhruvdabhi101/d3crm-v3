import type { LeadStatus, Prisma } from "@prisma/client";
import { RequestError } from "./security.ts";

export async function saveLead(tx: Prisma.TransactionClient, organizationId: string, actorId: string, id: string, input: { status: LeadStatus; assigneeId: string | null; followUpAt: Date | null; updatedAt: Date; unread: boolean }) {
  const previous = await tx.submission.findFirst({ where: { id, form: { organizationId } } });
  if (!previous) throw new RequestError("Enquiry not found.", 404);
  if (input.assigneeId && !await tx.organizationMember.findFirst({ where: { organizationId, userId: input.assigneeId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } } })) throw new RequestError("Choose a workspace team member.", 400);
  const readChanged = Boolean(previous.readAt) === input.unread;
  const changed = previous.status !== input.status || previous.assigneeId !== input.assigneeId || previous.followUpAt?.getTime() !== input.followUpAt?.getTime() || readChanged;
  if (previous.updatedAt.getTime() !== input.updatedAt.getTime()) throw new RequestError("This enquiry changed. Reload before saving.", 409);
  if (!changed) return;
  const result = await tx.submission.updateMany({ where: { id, form: { organizationId }, updatedAt: input.updatedAt }, data: {
    status: input.status, assigneeId: input.assigneeId, followUpAt: input.followUpAt,
    readAt: input.unread ? null : previous.readAt ?? new Date(),
    ...(previous.followUpAt?.getTime() !== input.followUpAt?.getTime() ? { followUpNotifiedAt: null } : {}),
    ...(!previous.firstContactedAt && input.status === "CONTACTED" && previous.status !== "CONTACTED" ? { firstContactedAt: new Date() } : {}),
  } });
  if (!result.count) throw new RequestError("This enquiry changed. Reload before saving.", 409);
  await tx.activity.create({ data: { organizationId, actorId, submissionId: id, subjectId: id, action: "lead.updated", details: { previousStatus: previous.status, status: input.status, previousAssigneeId: previous.assigneeId, assigneeId: input.assigneeId, previousFollowUpAt: previous.followUpAt?.toISOString() ?? null, followUpAt: input.followUpAt?.toISOString() ?? null, unread: input.unread } } });
}

export async function addLeadNote(tx: Prisma.TransactionClient, organizationId: string, actorId: string, id: string, body: string) {
  if (!await tx.submission.findFirst({ where: { id, form: { organizationId } }, select: { id: true } })) throw new RequestError("Enquiry not found.", 404);
  await tx.submissionNote.create({ data: { submissionId: id, authorId: actorId, body } });
  await tx.activity.create({ data: { organizationId, actorId, submissionId: id, subjectId: id, action: "lead.note_added" } });
}

export async function removeLead(tx: Prisma.TransactionClient, organizationId: string, actorId: string, id: string) {
  const removed = await tx.submission.deleteMany({ where: { id, form: { organizationId } } });
  if (removed.count) await tx.activity.create({ data: { organizationId, actorId, subjectId: id, action: "lead.deleted" } });
}
