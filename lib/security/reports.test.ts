import assert from "node:assert/strict";
import test from "node:test";
import { contactDuration, reportRange } from "../reports.ts";
test("reports use inclusive UTC calendar dates, bounded ranges, and honest unknown contact times", () => {
  const range = reportRange(undefined, undefined, new Date("2026-10-03T18:30:00Z"));
  assert.equal(range.from, "2026-09-04"); assert.equal(range.to, "2026-10-03"); assert.equal(range.end.toISOString(), "2026-10-04T00:00:00.000Z");
  for (const [from, to] of [["2026-02-30", "2026-03-01"], ["2026-10-04", "2026-10-03"], ["2024-01-01", "2026-01-01"], ["invalid", "2026-10-03"]]) assert.throws(() => reportRange(from, to));
  assert.equal(contactDuration(null), "Not recorded"); assert.equal(contactDuration(0), "< 1 min"); assert.equal(contactDuration(3600), "1.0 hr");
});
