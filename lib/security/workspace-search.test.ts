import test from "node:test";
import assert from "node:assert/strict";
import { searchQuery, searchTitle } from "../workspace-search.ts";
import { weeklyDays } from "../weekly-activity.ts";

test("workspace search bounds and previews", () => {
  assert.equal(searchQuery("  studio  "), "studio");
  for (const value of [null, "", "a", "x".repeat(121)]) assert.equal(searchQuery(value), "");
  assert.equal(searchQuery("x".repeat(120)).length, 120);
  assert.equal(searchTitle({ empty: "", bool: true, name: "Alex", email: "private@example.test" }), "Alex");
  assert.equal(searchTitle({ name: "x".repeat(200) }).length, 100);
  assert.equal(searchTitle(null), "Enquiry");
  assert.equal(searchTitle(["value"]), "Enquiry");
});

test("weekly activity fills missing days in UTC across month boundaries", () => {
  const days = weeklyDays([{ day: "2026-09-30", total: 3 }, { day: "2026-10-05", total: 2 }], new Date("2026-10-05T23:59:59Z"));
  assert.equal(days.length, 7);
  assert.deepEqual(days[0], { day: "2026-09-29", total: 0 });
  assert.deepEqual(days[1], { day: "2026-09-30", total: 3 });
  assert.deepEqual(days[6], { day: "2026-10-05", total: 2 });
});
