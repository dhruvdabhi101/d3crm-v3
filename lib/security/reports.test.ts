import assert from "node:assert/strict";
import test from "node:test";
import { arrivalGrid, contactDuration, fillDays, percentChange, previousRange, reportRange } from "../reports.ts";
test("reports use inclusive UTC calendar dates, bounded ranges, and honest unknown contact times", () => {
  const range = reportRange(undefined, undefined, new Date("2026-10-03T18:30:00Z"));
  assert.equal(range.from, "2026-09-04"); assert.equal(range.to, "2026-10-03"); assert.equal(range.end.toISOString(), "2026-10-04T00:00:00.000Z");
  for (const [from, to] of [["2026-02-30", "2026-03-01"], ["2026-10-04", "2026-10-03"], ["2024-01-01", "2026-01-01"], ["invalid", "2026-10-03"]]) assert.throws(() => reportRange(from, to));
  assert.equal(contactDuration(null), "Not recorded"); assert.equal(contactDuration(0), "< 1 min"); assert.equal(contactDuration(3600), "1.0 hr");
});

test("report charts fill empty days, compare equal periods, and bucket arrivals by weekday and slot", () => {
  const range = reportRange("2026-10-01", "2026-10-03");
  assert.deepEqual(fillDays(range, [{ day: "2026-10-02", total: 4 }]), [{ day: "2026-10-01", total: 0 }, { day: "2026-10-02", total: 4 }, { day: "2026-10-03", total: 0 }]);
  const before = previousRange(range);
  assert.equal(before.start.toISOString(), "2026-09-28T00:00:00.000Z"); assert.equal(before.end.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(percentChange(12, 10), 20); assert.equal(percentChange(5, 0), null); assert.equal(percentChange(0, 4), -100);
  const grid = arrivalGrid([{ dow: 1, slot: 3, total: 2 }, { dow: 7, slot: 7, total: 1 }, { dow: 8, slot: 0, total: 9 }]);
  assert.equal(grid.length, 7); assert.equal(grid[0][3], 2); assert.equal(grid[6][7], 1); assert.equal(grid.flat().reduce((a, b) => a + b), 3);
});
