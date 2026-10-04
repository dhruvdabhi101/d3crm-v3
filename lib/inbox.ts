import type { Prisma } from "@prisma/client";
import { inboxFilters } from "./inbox-filters.ts";
import { RequestError } from "./security.ts";

export async function saveInboxView(tx: Prisma.TransactionClient, organizationId: string, userId: string, name: string, input: unknown) {
  name = name.trim();
  if (name.length < 1 || name.length > 60) throw new RequestError("Use a view name between 1 and 60 characters.", 400);
  const filters = inboxFilters(input);
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
  if (!await tx.organizationMember.findUnique({ where: { userId_organizationId: { userId, organizationId } } })) throw new RequestError("You no longer have workspace access.", 403);
  if (filters.form && !await tx.form.findFirst({ where: { id: filters.form, organizationId } })) throw new RequestError("Choose a form in this workspace.", 400);
  const where = { userId, organizationId };
  if (await tx.savedInboxView.count({ where }) >= 20) throw new RequestError("You can save up to 20 views per workspace. Remove a view first.", 400);
  if (await tx.savedInboxView.findFirst({ where: { ...where, name: { equals: name, mode: "insensitive" } } })) throw new RequestError("A view with this name already exists.", 400);
  return tx.savedInboxView.create({ data: { name, filters, userId, organizationId } });
}

export async function removeInboxView(tx: Prisma.TransactionClient, organizationId: string, userId: string, id: string) {
  if (!await tx.organizationMember.findUnique({ where: { userId_organizationId: { userId, organizationId } } })) throw new RequestError("You no longer have workspace access.", 403);
  const result = await tx.savedInboxView.deleteMany({ where: { id, userId, organizationId } });
  if (!result.count) throw new RequestError("Saved view not found.", 404);
}
