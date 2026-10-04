import type { Prisma } from "@prisma/client";
import { checkQuota } from "../billing.ts";
import { createFormKey } from "../keys.ts";
import { RequestError } from "../security.ts";
import { toSlug } from "../slug.ts";
import { parseFormSchema } from "./validate.ts";

export async function duplicateFormInWorkspace(tx: Prisma.TransactionClient, organizationId: string, actorId: string, sourceId: string, name: string) {
  name = name.trim();
  if (name.length < 2 || name.length > 100) throw new RequestError("Use a form name between 2 and 100 characters.", 400);
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  const actor = await tx.organizationMember.findFirst({ where: { organizationId, userId: actorId, role: { in: ["OWNER", "ADMIN"] }, user: { emailVerifiedAt: { not: null } } } });
  if (!actor) throw new RequestError("A verified owner or admin must duplicate forms.", 403);
  const source = await tx.form.findFirst({ where: { id: sourceId, organizationId }, select: { schema: true, allowedOrigins: true } });
  if (!source) throw new RequestError("Form not found.", 404);
  let schema;
  try { schema = parseFormSchema(source.schema); }
  catch { throw new RequestError("Review this form's fields before duplicating it.", 422); }
  await checkQuota(tx, organizationId, "forms");
  const key = createFormKey();
  // Only copy the field contract and origins; all delivery and routing settings keep their safe defaults.
  const form = await tx.form.create({ data: { name, schema, allowedOrigins: source.allowedOrigins, organizationId, status: "DRAFT", slug: `${toSlug(name) || "form"}-${crypto.randomUUID()}`, keyPrefix: key.prefix, keyHash: key.hash } });
  await tx.activity.create({ data: { organizationId, actorId, subjectId: form.id, action: "form.duplicated", details: { sourceFormId: sourceId } } });
  return { id: form.id, name: form.name, slug: form.slug, key: key.key, schema, allowedOrigins: form.allowedOrigins };
}
