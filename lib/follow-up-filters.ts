export const ACTIVE_FOLLOW_UP_STATUSES = ["NEW", "CONTACTED", "QUALIFIED"] as const;
export const FOLLOW_UP_PERIODS = ["overdue", "today", "upcoming", "all"] as const;
export type FollowUpPeriod = typeof FOLLOW_UP_PERIODS[number];
export type FollowUpFilters = { period: FollowUpPeriod; assignee: "all" | "mine" | "unassigned"; form: string };

export function followUpFilters(input: unknown): FollowUpFilters {
  const values = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const value = (key: string) => typeof values[key] === "string" ? values[key] as string : "";
  return {
    period: FOLLOW_UP_PERIODS.includes(value("period") as FollowUpPeriod) ? value("period") as FollowUpPeriod : "overdue",
    assignee: value("assignee") === "mine" ? "mine" : value("assignee") === "unassigned" ? "unassigned" : "all",
    form: value("form").trim().slice(0, 100),
  };
}

export function followUpRange(period: FollowUpPeriod, now = new Date()): { gte?: Date; lt?: Date; not?: null } {
  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const tomorrow = new Date(today.getTime() + 86400_000);
  if (period === "overdue") return { lt: today };
  if (period === "today") return { gte: today, lt: tomorrow };
  if (period === "upcoming") return { gte: tomorrow, lt: new Date(today.getTime() + 8 * 86400_000) };
  return { not: null };
}

export function followUpLink(filters: FollowUpFilters, overrides: Partial<FollowUpFilters> & { page?: string } = {}) {
  const next = followUpFilters({ ...filters, ...overrides });
  const params = new URLSearchParams({ ...next });
  if (overrides.page && /^\d+$/.test(overrides.page) && Number.isSafeInteger(Number(overrides.page)) && Number(overrides.page) > 1) params.set("page", overrides.page);
  return `/follow-ups?${params}`;
}
