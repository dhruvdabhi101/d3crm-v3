import assert from "node:assert/strict";
import test from "node:test";
import { parseFormSchema, validateSubmission } from "./validate.ts";

const schema = {
  version: 1 as const,
  fields: [
    { id: "email", label: "Email", type: "email" as const, required: true },
    { id: "size", label: "Team size", type: "number" as const, required: false },
    { id: "consent", label: "Consent", type: "checkbox" as const, required: true },
  ],
};

test("validates and normalizes a submission", () => {
  assert.deepEqual(validateSubmission(schema, { email: " hi@example.com ", size: "12", consent: true }), {
    success: true,
    data: { email: "hi@example.com", size: 12, consent: true },
  });
});

test("rejects invalid and unknown values", () => {
  const result = validateSubmission(schema, { email: "nope", consent: false, admin: true });
  assert.equal(result.success, false);
  if (!result.success) assert.deepEqual(result.errors, { admin: "Unknown field.", email: "Enter a valid email address.", consent: "Must be accepted." });
});

test("rejects whitespace, numeric coercion from non-text values, and unsafe field keys", () => {
  const required = { version: 1, fields: [{ id: "name", label: "Name", type: "text", required: true }] };
  const blank = validateSubmission(required, { name: "   " });
  assert.equal(blank.success, false);
  for (const value of [true, false, [], [1], {}]) assert.equal(validateSubmission(schema, { email: "hi@example.com", consent: true, size: value }).success, false);
  assert.throws(() => parseFormSchema({ version: 1, fields: [{ id: "constructor", label: "Bad key", type: "text", required: false }] }));
  const polluted = validateSubmission(required, JSON.parse('{"name":"Ada","__proto__":{"polluted":true}}'));
  assert.equal(polluted.success, false);
  if (!polluted.success) assert.equal(Object.hasOwn(polluted.errors, "__proto__"), true);
});
