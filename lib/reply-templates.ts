import type { Prisma } from "@prisma/client";
import { replyInput } from "./replies.ts";
import { RequestError } from "./request-error.ts";

async function templateAccess(tx: Prisma.TransactionClient, organizationId: string, actorId: string) {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  const actor = await tx.organizationMember.findFirst({ where: { organizationId, userId: actorId, role: { in: ["OWNER", "ADMIN"] }, user: { emailVerifiedAt: { not: null } } } });
  if (!actor) throw new RequestError("A verified workspace owner or admin must manage reply templates.", 403);
}

export async function saveReplyTemplate(tx: Prisma.TransactionClient, organizationId: string, actorId: string, input: unknown, existing?: { id: string; updatedAt: Date }) {
  const content = replyInput(input);
  await templateAccess(tx, organizationId, actorId);
  const previous = existing ? await tx.replyTemplate.findFirst({ where: { id: existing.id, organizationId } }) : null;
  if (existing && !previous) throw new RequestError("Reply template not found.", 404);
  if (existing && previous!.updatedAt.getTime() !== existing.updatedAt.getTime()) throw new RequestError("This template changed. Reload before saving.", 409);
  if (!existing && await tx.replyTemplate.count({ where: { organizationId } }) >= 30) throw new RequestError("This workspace can have up to 30 reply templates. Remove a template first.", 400);
  if (await tx.replyTemplate.findFirst({ where: { organizationId, name: { equals: content.name, mode: "insensitive" }, ...(existing ? { id: { not: existing.id } } : {}) } })) throw new RequestError("A template with this name already exists.", 400);
  if (previous && previous.name === content.name && previous.subject === content.subject && previous.body === content.body) return previous;
  const template = previous ? await tx.replyTemplate.update({ where: { id: previous.id }, data: { ...content, updatedAt: new Date(Math.max(Date.now(), previous.updatedAt.getTime() + 1)) } }) : await tx.replyTemplate.create({ data: { ...content, organizationId } });
  await tx.activity.create({ data: { organizationId, actorId, subjectId: template.id, action: previous ? "reply_template.updated" : "reply_template.created" } });
  return template;
}

export async function removeReplyTemplate(tx: Prisma.TransactionClient, organizationId: string, actorId: string, id: string, updatedAt: Date) {
  await templateAccess(tx, organizationId, actorId);
  const template = await tx.replyTemplate.findFirst({ where: { id, organizationId } });
  if (!template) throw new RequestError("Reply template not found.", 404);
  if (template.updatedAt.getTime() !== updatedAt.getTime()) throw new RequestError("This template changed. Reload before deleting.", 409);
  await tx.replyTemplate.delete({ where: { id } });
  await tx.activity.create({ data: { organizationId, actorId, subjectId: id, action: "reply_template.deleted" } });
}
