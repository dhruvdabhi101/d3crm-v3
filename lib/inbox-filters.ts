import { z } from "zod";
import { LEAD_STATUSES } from "./leads.ts";
import { RequestError } from "./request-error.ts";

export type InboxFilters = { q: string; status: string; form: string; view: string; sort: string; layout: string };

export function inboxFilters(input: unknown): InboxFilters {
  const values = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
  const value = (key: string) => typeof values[key] === "string" ? values[key] as string : "";
  return {
    q: value("q").trim().slice(0, 200),
    status: LEAD_STATUSES.includes(value("status") as typeof LEAD_STATUSES[number]) ? value("status") : "",
    form: value("form").slice(0, 100),
    view: ["unread", "mine", "overdue", "unassigned"].includes(value("view")) ? value("view") : "",
    sort: ["oldest", "followup"].includes(value("sort")) ? value("sort") : "newest",
    layout: value("layout") === "board" ? "board" : "list",
  };
}

export function inboxLink(filters: InboxFilters, overrides: Record<string, string> = {}) {
  return `/submissions?${new URLSearchParams({ ...filters, ...overrides })}`;
}

export function followUpDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || isNaN(date.getTime()) || date.getUTCFullYear() < 1 || date.toISOString().slice(0, 10) !== value) throw new RequestError("Choose a valid follow-up date.", 400);
  return date;
}

const id = z.string().min(1).max(100).refine(value => value.trim() === value);
const bulkSchema = z.object({
  items: z.array(z.object({ id, updatedAt: z.string().datetime({ offset: true }) })).min(1).max(25),
  change: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("status"), value: z.enum(LEAD_STATUSES) }),
    z.object({ kind: z.literal("assignee"), value: id.nullable() }),
    z.object({ kind: z.literal("read"), value: z.boolean() }),
    z.object({ kind: z.literal("followup"), value: z.string().max(10) }),
  ]),
});
export type BulkLeadInput = z.infer<typeof bulkSchema>;
export function bulkLeadInput(input: unknown): BulkLeadInput {
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) throw new RequestError("Select 1 to 25 enquiries and a valid update.", 400);
  if (new Set(parsed.data.items.map(item => item.id)).size !== parsed.data.items.length) throw new RequestError("Select each enquiry only once.", 400);
  if (parsed.data.change.kind === "followup") followUpDate(parsed.data.change.value);
  return parsed.data;
}
