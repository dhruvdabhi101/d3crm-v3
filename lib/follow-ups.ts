import type { Prisma } from "@prisma/client";
import { db } from "./db.ts";
import { ACTIVE_FOLLOW_UP_STATUSES, FOLLOW_UP_PERIODS, followUpRange, type FollowUpFilters, type FollowUpPeriod } from "./follow-up-filters.ts";

export function followUpWhere(organizationId: string, userId: string, filters: FollowUpFilters, now = new Date()): Prisma.SubmissionWhereInput {
  return {
    form: { organizationId },
    status: { in: [...ACTIVE_FOLLOW_UP_STATUSES] },
    followUpAt: followUpRange(filters.period, now),
    ...(filters.form ? { formId: filters.form } : {}),
    ...(filters.assignee === "mine" ? { assigneeId: userId } : filters.assignee === "unassigned" ? { assigneeId: null } : {}),
  };
}

export async function followUpAgenda(organizationId: string, userId: string, filters: FollowUpFilters, requestedPage = 1, now = new Date()) {
  const where = followUpWhere(organizationId, userId, filters, now);
  const [periodCounts, forms] = await Promise.all([
    Promise.all(FOLLOW_UP_PERIODS.map(async period => [period, await db.submission.count({ where: followUpWhere(organizationId, userId, { ...filters, period }, now) })] as const)),
    db.form.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
  ]);
  const counts = Object.fromEntries(periodCounts) as Record<FollowUpPeriod, number>;
  const total = counts[filters.period];
  const pages = Math.max(1, Math.ceil(total / 25));
  const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, pages);
  const rows = await db.submission.findMany({
    where,
    select: { id: true, data: true, contactEmail: true, status: true, followUpAt: true, updatedAt: true, form: { select: { id: true, name: true } }, assignee: { select: { name: true } } },
    orderBy: [{ followUpAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 25,
    skip: (page - 1) * 25,
  });
  return { rows, counts, forms, page, pages, total };
}
