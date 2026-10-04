import { Prisma } from "@prisma/client";
import { db } from "./db.ts";
import { RequestError } from "./security.ts";
import { toSlug } from "./slug.ts";

export function clientInput(name: string, website: string) {
  name = name.trim(); website = website.trim();
  if (name.length < 2 || name.length > 100) throw new RequestError("Use a client name between 2 and 100 characters.", 400);
  if (!website) return { name, clientWebsite: null };
  let url;
  try { url = new URL(website); } catch { throw new RequestError("Use a full HTTP or HTTPS website address.", 400); }
  if (website.length > 2048 || !["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new RequestError("Use a website address without credentials, up to 2048 characters.", 400);
  return { name, clientWebsite: url.origin };
}

export async function createClientWorkspace(tx: Prisma.TransactionClient, actorId: string, sourceOrganizationId: string, input: ReturnType<typeof clientInput>) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId} FOR UPDATE`;
  const actor = await tx.organizationMember.findFirst({ where: { organizationId: sourceOrganizationId, userId: actorId, role: { in: ["OWNER", "ADMIN"] }, user: { emailVerifiedAt: { not: null } } } });
  if (!actor) throw new RequestError("A verified owner or admin must create client workspaces.", 403);
  if (await tx.organizationMember.count({ where: { userId: actorId, role: "OWNER" } }) >= 50) throw new RequestError("You can own up to 50 workspaces.", 429);
  const workspace = await tx.organization.create({ data: { ...input, isClient: true, slug: `${toSlug(input.name) || "client"}-${crypto.randomUUID()}`, members: { create: { userId: actorId, role: "OWNER" } } } });
  await tx.activity.create({ data: { organizationId: workspace.id, actorId, subjectId: workspace.id, action: "organization.client_created" } });
  return workspace;
}

export async function clientWorkspaces(userId: string) {
  const memberships = await db.organizationMember.findMany({ where: { userId, organization: { isClient: true } }, include: { organization: { include: { _count: { select: { forms: { where: { status: { not: "ARCHIVED" } } }, members: true } } } } }, orderBy: { organization: { name: "asc" } } });
  const ids = memberships.map(item => item.organizationId);
  const counts = ids.length ? await db.$queryRaw<{ organizationId: string; total: number; unread: number; unassigned: number; overdue: number; lastReceived: Date | null }[]>(Prisma.sql`
    SELECT f."organizationId", count(*) FILTER (WHERE s.status != 'SPAM')::int AS total,
      count(*) FILTER (WHERE s."readAt" IS NULL AND s.status != 'SPAM')::int AS unread,
      count(*) FILTER (WHERE s."assigneeId" IS NULL AND s.status = 'NEW')::int AS unassigned,
      count(*) FILTER (WHERE s."followUpAt" <= CURRENT_TIMESTAMP AND s.status IN ('NEW','CONTACTED','QUALIFIED'))::int AS overdue,
      max(s."createdAt") AS "lastReceived"
    FROM "Submission" s JOIN "Form" f ON f.id = s."formId"
    WHERE f."organizationId" IN (${Prisma.join(ids)}) GROUP BY f."organizationId"`) : [];
  return memberships.map(item => ({ ...item, counts: counts.find(row => row.organizationId === item.organizationId) ?? { total: 0, unread: 0, unassigned: 0, overdue: 0, lastReceived: null } }));
}
