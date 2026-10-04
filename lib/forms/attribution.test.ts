import assert from "node:assert/strict";
import test from "node:test";
import { submissionInput } from "./attribution.ts";
test("attribution stays separate from answers and strips sensitive URL query data", () => {
  assert.deepEqual(submissionInput({ name: "Alex", _context: { landing_page: "https://website.test/contact?email=private&token=secret#account", referrer: "https://search.test/?q=private", utm_source: " Google ", utm_medium: " CPC ", utm_campaign: "Autumn", utm_content: "" } }), { data: { name: "Alex" }, attribution: { landing_page: "https://website.test/contact", referrer: "https://search.test/", utm_source: "google", utm_medium: "cpc", utm_campaign: "Autumn" } });
  assert.deepEqual(submissionInput({ name: "Alex" }), { data: { name: "Alex" }, attribution: {} });
  for (const _context of [null, [], { unknown: "test" }, { utm_source: 1 }, { utm_source: "x".repeat(201) }, { landing_page: "javascript:alert(1)" }, { referrer: "https://user:password@example.test" }, JSON.parse('{"__proto__":"bad"}')]) assert.throws(() => submissionInput({ _context }));
});
