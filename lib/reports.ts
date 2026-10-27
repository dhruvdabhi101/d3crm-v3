import { Prisma } from "@prisma/client";
import { db } from "./db.ts";

function calendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose valid report dates.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Choose valid report dates.");
  return date;
}

export function reportRange(from?: string, to?: string, now = new Date()) {
  const end = calendarDate(to || now.toISOString().slice(0, 10));
  const start = calendarDate(from || new Date(end.getTime() - 29 * 86400_000).toISOString().slice(0, 10));
  if (start > end || end.getTime() - start.getTime() > 365 * 86400_000) throw new Error("Choose a date range of up to 366 days, with the start before the end.");
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10), start, end: new Date(end.getTime() + 86400_000) };
}

export async function leadReport(organizationId: string, range: ReturnType<typeof reportRange>, formId = "") {
  const scope = Prisma.sql`f."organizationId" = ${organizationId} AND s."createdAt" >= ${range.start} AND s."createdAt" < ${range.end} AND (${formId} = '' OR s."formId" = ${formId})`;
  const [totals, sources, forms, daily] = await Promise.all([
    db.$queryRaw<{ total: number; spam: number; won: number; qualified: number; lost: number; new: number; inContact: number; overdue: number; contacted: number; contactSeconds: number | null }[]>(Prisma.sql`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE s.status='SPAM')::int AS spam,
        count(*) FILTER (WHERE s.status='WON')::int AS won, count(*) FILTER (WHERE s.status='QUALIFIED')::int AS qualified,
        count(*) FILTER (WHERE s.status='LOST')::int AS lost, count(*) FILTER (WHERE s.status='NEW')::int AS "new",
        count(*) FILTER (WHERE s.status='CONTACTED')::int AS "inContact",
        count(*) FILTER (WHERE s."followUpAt" < CURRENT_TIMESTAMP AND s.status IN ('NEW','CONTACTED','QUALIFIED'))::int AS overdue,
        count(*) FILTER (WHERE s."firstContactedAt" IS NOT NULL AND s.status != 'SPAM')::int AS contacted,
        avg(EXTRACT(EPOCH FROM (s."firstContactedAt" - s."createdAt"))) FILTER (WHERE s."firstContactedAt" IS NOT NULL AND s.status != 'SPAM')::float8 AS "contactSeconds"
      FROM "Submission" s JOIN "Form" f ON f.id=s."formId" WHERE ${scope}`),
    db.$queryRaw<{ source: string; total: number; won: number }[]>(Prisma.sql`
      SELECT COALESCE(NULLIF(s.attribution->>'utm_source',''), NULLIF(s."sourceOrigin",''), 'Unknown') AS source,
        count(*)::int AS total, count(*) FILTER (WHERE s.status='WON')::int AS won
      FROM "Submission" s JOIN "Form" f ON f.id=s."formId" WHERE ${scope} AND s.status != 'SPAM'
      GROUP BY source ORDER BY total DESC, source ASC LIMIT 50`),
    db.$queryRaw<{ id: string; name: string; total: number; won: number }[]>(Prisma.sql`
      SELECT f.id, f.name, count(*)::int AS total, count(*) FILTER (WHERE s.status='WON')::int AS won
      FROM "Submission" s JOIN "Form" f ON f.id=s."formId" WHERE ${scope} AND s.status != 'SPAM'
      GROUP BY f.id, f.name ORDER BY total DESC, f.name ASC LIMIT 50`),
    db.$queryRaw<{ day: string; total: number }[]>(Prisma.sql`
      SELECT to_char(s."createdAt", 'YYYY-MM-DD') AS day, count(*)::int AS total
      FROM "Submission" s JOIN "Form" f ON f.id=s."formId" WHERE ${scope} AND s.status != 'SPAM'
      GROUP BY day ORDER BY day ASC`),
  ]);
  return { totals: totals[0], sources, forms, daily };
}

export function contactDuration(seconds: number | null) {
  if (seconds === null) return "Not recorded";
  if (seconds < 60) return "< 1 min";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hr`;
  return `${(seconds / 86400).toFixed(1)} days`;
}

export const ARRIVAL_SLOTS = ["00–03", "03–06", "06–09", "09–12", "12–15", "15–18", "18–21", "21–24"] as const;
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type ReportRange = ReturnType<typeof reportRange>;
export type ResponseCohort = { week: string; total: number; withinHour: number; withinDay: number; reached: number; won: number };

/** Every calendar day in the range, with zero for days that had no enquiries. */
export function fillDays(range: ReportRange, daily: { day: string; total: number }[]) {
  const totals = new Map(daily.map(day => [day.day, day.total]));
  const days: { day: string; total: number }[] = [];
  for (let time = range.start.getTime(); time < range.end.getTime(); time += 86400_000) {
    const day = new Date(time).toISOString().slice(0, 10);
    days.push({ day, total: totals.get(day) ?? 0 });
  }
  return days;
}

/** The same number of days immediately before the range, for comparison. */
export function previousRange(range: ReportRange) {
  const length = range.end.getTime() - range.start.getTime();
  return { start: new Date(range.start.getTime() - length), end: range.start };
}

/** Rounded percentage change, or null when there is nothing to compare against. */
export function percentChange(current: number, previous: number) {
  if (!previous) return null;
  return Math.round((current - previous) * 100 / previous);
}

/** A 7 × 8 grid of enquiry counts: ISO weekday (Mon first) by three-hour UTC slot. */
export function arrivalGrid(rows: { dow: number; slot: number; total: number }[]) {
  const grid = WEEKDAYS.map(() => ARRIVAL_SLOTS.map(() => 0));
  for (const row of rows) if (row.dow >= 1 && row.dow <= 7 && row.slot >= 0 && row.slot < 8) grid[row.dow - 1][row.slot] += row.total;
  return grid;
}

export async function reportTrends(organizationId: string, range: ReportRange, formId = "") {
  const previous = previousRange(range);
  const scope = Prisma.sql`f."organizationId" = ${organizationId} AND s."createdAt" >= ${range.start} AND s."createdAt" < ${range.end} AND (${formId} = '' OR s."formId" = ${formId}) AND s.status != 'SPAM'`;
  const [cohorts, arrivals, before] = await Promise.all([
    db.$queryRaw<ResponseCohort[]>(Prisma.sql`
      SELECT to_char(date_trunc('week', s."createdAt"), 'YYYY-MM-DD') AS week, count(*)::int AS total,
        count(*) FILTER (WHERE s."firstContactedAt" - s."createdAt" <= interval '1 hour')::int AS "withinHour",
        count(*) FILTER (WHERE s."firstContactedAt" - s."createdAt" <= interval '1 day')::int AS "withinDay",
        count(*) FILTER (WHERE s."firstContactedAt" IS NOT NULL)::int AS reached,
        count(*) FILTER (WHERE s.status='WON')::int AS won
      FROM "Submission" s JOIN "Form" f ON f.id=s."formId" WHERE ${scope}
      GROUP BY week ORDER BY week DESC LIMIT 12`),
    db.$queryRaw<{ dow: number; slot: number; total: number }[]>(Prisma.sql`
      SELECT extract(isodow FROM s."createdAt")::int AS dow, (extract(hour FROM s."createdAt")::int / 3) AS slot, count(*)::int AS total
      FROM "Submission" s JOIN "Form" f ON f.id=s."formId" WHERE ${scope}
      GROUP BY dow, slot`),
    db.$queryRaw<{ total: number; won: number }[]>(Prisma.sql`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE s.status='WON')::int AS won
      FROM "Submission" s JOIN "Form" f ON f.id=s."formId"
      WHERE f."organizationId" = ${organizationId} AND s."createdAt" >= ${previous.start} AND s."createdAt" < ${previous.end}
        AND (${formId} = '' OR s."formId" = ${formId}) AND s.status != 'SPAM'`),
  ]);
  return { cohorts: cohorts.reverse(), arrivals: arrivalGrid(arrivals), previous: before[0] };
}

/** The busiest weekday and slot, in words, for the heatmap heading. */
export function busiestSlot(grid: number[][]) {
  let best = { day: 0, slot: 0, count: 0 };
  grid.forEach((row, day) => row.forEach((count, slot) => { if (count > best.count) best = { day, slot, count }; }));
  return best.count ? `${WEEKDAYS[best.day]} ${ARRIVAL_SLOTS[best.slot]} UTC` : null;
}
