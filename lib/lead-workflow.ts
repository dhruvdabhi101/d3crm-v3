import type { LeadStatus, Prisma } from "@prisma/client";
import { RequestError } from "./security.ts";
import { bulkLeadInput, followUpDate } from "./inbox-filters.ts";

export async function bulkSaveLeads(tx: Prisma.TransactionClient, organizationId: string, actorId: string, input: unknown) {
  const { items, change } = bulkLeadInput(input);
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  if (!await tx.organizationMember.findFirst({ where: { organizationId, userId: actorId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } } })) throw new RequestError("You no longer have enquiry write access.", 403);
  const leads = await tx.submission.findMany({ where: { id: { in: items.map(item => item.id) }, form: { organizationId } } });
  if (leads.length !== items.length) throw new RequestError("An enquiry is no longer available. Reload the inbox.", 404);
  // Check the entire selection before writing; any conflict rolls back the batch.
  if (items.some(item => leads.find(lead => lead.id === item.id)!.updatedAt.getTime() !== new Date(item.updatedAt).getTime())) throw new RequestError("An enquiry changed. Reload the inbox before trying again.", 409);
  for (const lead of leads) {
    await saveLead(tx, organizationId, actorId, lead.id, {
      status: change.kind === "status" ? change.value : lead.status,
      assigneeId: change.kind === "assignee" ? change.value : lead.assigneeId,
      followUpAt: change.kind === "followup" ? followUpDate(change.value) : lead.followUpAt,
      unread: change.kind === "read" ? !change.value : !lead.readAt,
      updatedAt: lead.updatedAt,
    });
  }
  return leads.length;
}

export async function saveLead(tx: Prisma.TransactionClient, organizationId: string, actorId: string, id: string, input: { status: LeadStatus; assigneeId: string | null; followUpAt: Date | null; updatedAt: Date; unread: boolean }) {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  const previous = await tx.submission.findFirst({ where: { id, form: { organizationId } } });
  if (!previous) throw new RequestError("Enquiry not found.", 404);
  if (!await tx.organizationMember.findFirst({ where: { organizationId, userId: actorId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } } })) throw new RequestError("You no longer have enquiry write access.", 403);
  if (input.assigneeId && !await tx.organizationMember.findFirst({ where: { organizationId, userId: input.assigneeId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } } })) throw new RequestError("Choose a workspace team member.", 400);
  const readChanged = Boolean(previous.readAt) === input.unread;
  const changed = previous.status !== input.status || previous.assigneeId !== input.assigneeId || previous.followUpAt?.getTime() !== input.followUpAt?.getTime() || readChanged;
  if (previous.updatedAt.getTime() !== input.updatedAt.getTime()) throw new RequestError("This enquiry changed. Reload before saving.", 409);
  if (!changed) return;
  const result = await tx.submission.updateMany({ where: { id, form: { organizationId }, updatedAt: input.updatedAt }, data: {
    status: input.status, assigneeId: input.assigneeId, followUpAt: input.followUpAt,
    updatedAt: new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1)),
    ...(previous.assigneeId !== input.assigneeId ? { unassignedNotifiedAt: null } : {}),
    readAt: input.unread ? null : previous.readAt ?? new Date(),
    ...(previous.followUpAt?.getTime() !== input.followUpAt?.getTime() ? { followUpNotifiedAt: null } : {}),
    ...(!previous.firstContactedAt && input.status === "CONTACTED" && previous.status !== "CONTACTED" ? { firstContactedAt: new Date() } : {}),
  } });
  if (!result.count) throw new RequestError("This enquiry changed. Reload before saving.", 409);
  await tx.activity.create({ data: { organizationId, actorId, submissionId: id, subjectId: id, action: "lead.updated", details: { previousStatus: previous.status, status: input.status, previousAssigneeId: previous.assigneeId, assigneeId: input.assigneeId, previousFollowUpAt: previous.followUpAt?.toISOString() ?? null, followUpAt: input.followUpAt?.toISOString() ?? null, unread: input.unread } } });
}

export async function addLeadNote(tx: Prisma.TransactionClient, organizationId: string, actorId: string, id: string, body: string) {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  if (!await tx.organizationMember.findFirst({ where: { organizationId, userId: actorId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } } })) throw new RequestError("You no longer have enquiry write access.", 403);
  if (!await tx.submission.findFirst({ where: { id, form: { organizationId } }, select: { id: true } })) throw new RequestError("Enquiry not found.", 404);
  await tx.submissionNote.create({ data: { submissionId: id, authorId: actorId, body } });
  await tx.activity.create({ data: { organizationId, actorId, submissionId: id, subjectId: id, action: "lead.note_added" } });
}

export async function removeLead(tx: Prisma.TransactionClient, organizationId: string, actorId: string, id: string) {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  if (!await tx.organizationMember.findFirst({ where: { organizationId, userId: actorId, role: { in: ["OWNER", "ADMIN"] } } })) throw new RequestError("Only current owners and admins can delete enquiries.", 403);
  const removed = await tx.submission.deleteMany({ where: { id, form: { organizationId } } });
  if (removed.count) await tx.activity.create({ data: { organizationId, actorId, subjectId: id, action: "lead.deleted" } });
}
