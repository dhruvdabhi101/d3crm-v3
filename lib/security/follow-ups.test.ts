import assert from "node:assert/strict";
import { test } from "node:test";
import { ACTIVE_FOLLOW_UP_STATUSES, followUpFilters, followUpLink, followUpRange } from "../follow-up-filters.ts";

test("follow-up filters whitelist values without accepting cross-workspace scope", () => {
  const filters = followUpFilters({ period: "upcoming", assignee: "mine", form: " form-1 ", organizationId: "other", page: "99", callbackUrl: "https://evil.example" });
  assert.deepEqual(filters, { period: "upcoming", assignee: "mine", form: "form-1" });
  assert.deepEqual(followUpFilters({ period: [], assignee: "everyone", form: null }), { period: "overdue", assignee: "all", form: "" });
  assert.deepEqual(followUpFilters(null), followUpFilters([]));
  assert.equal(followUpFilters({ form: "a".repeat(200) }).form.length, 100);
  const url = new URL(followUpLink(filters, { period: "today", page: "2" }), "http://localhost");
  assert.equal(url.pathname, "/follow-ups");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("period"), "today");
  assert.equal(url.searchParams.get("form"), "form-1");
  assert.equal(url.searchParams.size, 4);
  for (const page of ["0", "1", "-1", "Infinity", "2.5", "99999999999999999999"]) assert.ok(!new URL(followUpLink(filters, { page }), "http://localhost").searchParams.has("page"));
  assert.ok(!new URL(followUpLink(filters), "http://localhost").searchParams.has("page"));
});

test("follow-up periods are disjoint UTC calendar ranges across midnight and year boundaries", () => {
  const now = new Date("2026-12-31T23:59:59.999Z");
  const overdue = followUpRange("overdue", now);
  const today = followUpRange("today", now);
  const upcoming = followUpRange("upcoming", now);
  assert.equal(overdue.lt?.toISOString(), "2026-12-31T00:00:00.000Z");
  assert.equal(today.gte?.toISOString(), overdue.lt?.toISOString());
  assert.equal(today.lt?.toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(upcoming.gte?.toISOString(), today.lt?.toISOString());
  assert.equal(upcoming.lt?.toISOString(), "2027-01-08T00:00:00.000Z");
  assert.equal(upcoming.lt!.getTime() - upcoming.gte!.getTime(), 7 * 86400_000);
  assert.deepEqual(followUpRange("all", now), { not: null });
  assert.deepEqual(ACTIVE_FOLLOW_UP_STATUSES, ["NEW", "CONTACTED", "QUALIFIED"]);
  assert.equal(followUpRange("today", new Date("2026-03-08T01:30:00-08:00")).gte?.toISOString(), "2026-03-08T00:00:00.000Z");
});
