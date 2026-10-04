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
    db.$queryRaw<{ total: number; spam: number; won: number; qualified: number; lost: number; overdue: number; contacted: number; contactSeconds: number | null }[]>(Prisma.sql`
      SELECT count(*)::int AS total, count(*) FILTER (WHERE s.status='SPAM')::int AS spam,
        count(*) FILTER (WHERE s.status='WON')::int AS won, count(*) FILTER (WHERE s.status='QUALIFIED')::int AS qualified,
        count(*) FILTER (WHERE s.status='LOST')::int AS lost,
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
