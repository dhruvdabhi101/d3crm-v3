import type { Prisma } from "@prisma/client";
import { db } from "./db.ts";
import { mailJob } from "./deliveries.ts";
import { appUrl, RequestError } from "./security.ts";

export function routingInput(formData: FormData) {
  const assignmentMode = String(formData.get("assignmentMode") ?? "NONE");
  if (!["NONE", "DEFAULT", "ROUND_ROBIN"].includes(assignmentMode)) throw new RequestError("Choose a valid assignment mode.", 400);
  const defaultAssigneeId = String(formData.get("defaultAssigneeId") ?? "") || null;
  const assignmentMemberIds = [...new Set(formData.getAll("assignmentMemberIds").map(String))].sort();
  const minutes = Number(formData.get("unassignedAlertMinutes") ?? 0);
  if (![0, 15, 30, 60, 120, 240, 1440].includes(minutes)) throw new RequestError("Choose a valid alert delay.", 400);
  if (assignmentMode === "DEFAULT" && !defaultAssigneeId) throw new RequestError("Choose a default assignee.", 400);
  if (assignmentMode === "ROUND_ROBIN" && (!assignmentMemberIds.length || assignmentMemberIds.length > 50)) throw new RequestError("Choose between 1 and 50 team members.", 400);
  return { assignmentMode: assignmentMode as "NONE" | "DEFAULT" | "ROUND_ROBIN", defaultAssigneeId: assignmentMode === "DEFAULT" ? defaultAssigneeId : null, assignmentMemberIds: assignmentMode === "ROUND_ROBIN" ? assignmentMemberIds : [], unassignedAlertMinutes: minutes || null };
}

export async function saveRouting(tx: Prisma.TransactionClient, organizationId: string, actorId: string, formId: string, updatedAt: Date, input: ReturnType<typeof routingInput>) {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  if (!await tx.organizationMember.findFirst({ where: { organizationId, userId: actorId, role: { in: ["OWNER", "ADMIN"] } } })) throw new RequestError("Only owners and admins can change routing.", 403);
  const members = input.defaultAssigneeId ? [input.defaultAssigneeId] : input.assignmentMemberIds;
  if (members.length && await tx.organizationMember.count({ where: { organizationId, userId: { in: members }, role: { in: ["OWNER", "ADMIN", "MEMBER"] } } }) !== members.length) throw new RequestError("Choose current workspace members with enquiry write access.", 400);
  const result = await tx.form.updateMany({ where: { id: formId, organizationId, updatedAt }, data: { ...input, assignmentCursor: 0 } });
  if (!result.count) throw new RequestError("The form changed. Reload before saving routing.", 409);
  await tx.activity.create({ data: { organizationId, actorId, subjectId: formId, action: "form.routing_changed", details: input } });
}

export async function chooseAssignee(tx: Prisma.TransactionClient, formId: string, organizationId: string) {
  // Use the same organization lock as quotas and membership changes to serialize routing.
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  const form = await tx.form.findFirstOrThrow({ where: { id: formId, organizationId } });
  const ids = form.assignmentMode === "DEFAULT" && form.defaultAssigneeId ? [form.defaultAssigneeId] : form.assignmentMode === "ROUND_ROBIN" ? form.assignmentMemberIds : [];
  const members = await tx.organizationMember.findMany({ where: { organizationId, userId: { in: ids }, role: { in: ["OWNER", "ADMIN", "MEMBER"] } }, select: { userId: true } });
  const eligible = ids.filter(id => members.some(member => member.userId === id));
  if (!eligible.length) return { assigneeId: null, mode: form.assignmentMode };
  const assigneeId = eligible[form.assignmentCursor % eligible.length];
  if (form.assignmentMode === "ROUND_ROBIN") await tx.form.update({ where: { id: formId }, data: { assignmentCursor: (form.assignmentCursor + 1) % eligible.length } });
  return { assigneeId, mode: form.assignmentMode };
}

export async function queueUnassignedAlerts() {
  const due = await db.$queryRaw<{ id: string; organizationId: string }[]>`
    SELECT s.id, f."organizationId" FROM "Submission" s JOIN "Form" f ON f.id = s."formId"
    WHERE s.status = 'NEW' AND s."assigneeId" IS NULL AND s."unassignedNotifiedAt" IS NULL
      AND f."unassignedAlertMinutes" > 0 AND cardinality(f."notificationEmails") > 0
      AND s."createdAt" <= CURRENT_TIMESTAMP - f."unassignedAlertMinutes" * INTERVAL '1 minute'
    ORDER BY s."createdAt" ASC LIMIT 50`;
  for (const item of due) await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${item.organizationId} FOR UPDATE`;
    const lead = await tx.submission.findFirst({ where: { id: item.id, status: "NEW", assigneeId: null, unassignedNotifiedAt: null }, include: { form: true } });
    if (!lead?.form.unassignedAlertMinutes || lead.createdAt.getTime() > Date.now() - lead.form.unassignedAlertMinutes * 60_000) return;
    const members = await tx.organizationMember.findMany({ where: { organizationId: item.organizationId, user: { email: { in: lead.form.notificationEmails }, emailVerifiedAt: { not: null } } }, select: { user: { select: { email: true } } } });
    if (!members.length) return;
    const alertAt = new Date();
    const claimed = await tx.submission.updateMany({ where: { id: lead.id, status: "NEW", assigneeId: null, unassignedNotifiedAt: null }, data: { unassignedNotifiedAt: alertAt } });
    if (!claimed.count) return;
    await tx.outboundDelivery.createMany({ data: members.map(({ user }) => ({ ...mailJob(user.email, `Unassigned enquiry: ${lead.form.name}`, `An enquiry is still unassigned.\n${appUrl()}/submissions/${lead.id}`, undefined, lead.formId, "unassigned", alertAt.toISOString()), submissionId: lead.id })) });
  });
}
