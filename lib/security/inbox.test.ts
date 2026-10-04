import assert from "node:assert/strict";
import { test } from "node:test";
import { bulkLeadInput, followUpDate, inboxFilters, inboxLink } from "../inbox-filters.ts";

test("inbox filters normalize untrusted inputs and links retain only supported settings", () => {
  const filters = inboxFilters({ q: "  Ada  ", status: "WON", form: "form-1", view: "unassigned", sort: "oldest", layout: "board", organizationId: "other", page: "99", callbackUrl: "https://evil.example" });
  assert.deepEqual(filters, { q: "Ada", status: "WON", form: "form-1", view: "unassigned", sort: "oldest", layout: "board" });
  const url = new URL(inboxLink(filters), "http://localhost");
  assert.equal(url.pathname, "/submissions"); assert.equal(url.searchParams.get("layout"), "board");
  assert.ok(!url.searchParams.has("organizationId") && !url.searchParams.has("callbackUrl") && !url.searchParams.has("page"));
  assert.deepEqual(inboxFilters({ q: [], status: "invalid", view: "everyone", sort: "random", layout: "unsafe" }), inboxFilters(null));
  assert.equal(inboxFilters({ q: "a".repeat(1000), form: "b".repeat(1000) }).q.length, 200);
});

test("bulk inputs require unique versioned records and one validated operation", () => {
  const item = { id: "lead-1", updatedAt: "2026-10-04T12:00:00.000Z" };
  assert.equal(bulkLeadInput({ items: [item], change: { kind: "status", value: "CONTACTED" } }).change.kind, "status");
  for (const input of [
    { items: [], change: { kind: "read", value: true } },
    { items: [item, item], change: { kind: "read", value: true } },
    { items: Array.from({ length: 26 }, (_, i) => ({ ...item, id: `lead-${i}` })), change: { kind: "read", value: true } },
    { items: [{ id: "lead-1" }], change: { kind: "status", value: "WON" } },
    { items: [item], change: { kind: "delete", value: true } },
    { items: [item], change: { kind: "read", value: "false" } },
    { items: [item], change: { kind: "assignee", value: "" } },
    { items: [item], change: { kind: "status", value: "INVALID" } },
    { items: [item], change: { kind: "followup", value: "2026-02-30" } },
  ]) assert.throws(() => bulkLeadInput(input), { status: 400 });
  assert.equal(bulkLeadInput({ items: [item], change: { kind: "assignee", value: null } }).change.value, null);
});

test("follow-up dates use real UTC calendar days and allow clearing", () => {
  assert.equal(followUpDate("2028-02-29")?.toISOString(), "2028-02-29T00:00:00.000Z");
  assert.equal(followUpDate(""), null);
  for (const value of ["0000-01-01", "2026-02-29", "2026-13-01", "2026-1-01", "not a date"]) assert.throws(() => followUpDate(value), { status: 400 });
});
