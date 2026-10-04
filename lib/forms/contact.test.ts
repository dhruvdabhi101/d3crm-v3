import assert from "node:assert/strict";
import test from "node:test";
import { primaryContactEmail } from "./contact.ts";

const schema = {
  version: 1,
  fields: [
    { id: "message", label: "Message", type: "textarea", required: false },
    { id: "email", label: "Email", type: "email", required: false },
    { id: "other_email", label: "Other email", type: "email", required: false },
  ],
};

test("contact email comes only from declared email fields in schema order", () => {
  assert.equal(primaryContactEmail(schema, { message: "person@example.com", email: "  PERSON@Example.com  ", other_email: "second@example.com" }), "person@example.com");
  assert.equal(primaryContactEmail(schema, { message: "person@example.com", arbitrary: "person@example.com" }), null);
  assert.equal(primaryContactEmail(schema, { email: "", other_email: "second@example.com" }), "second@example.com");
  assert.equal(primaryContactEmail(schema, Object.create({ email: "inherited@example.com" })), null);
});

test("contact extraction rejects recipient ambiguity, controls, malformed and oversized emails", () => {
  for (const email of ["one@example.com,two@example.com", "one@example.com;two@example.com", "one@example.com\n", "one@example.com\r\nBcc:other@example.com", "one\u0000@example.com", "Display <one@example.com>", "one..two@example.com", `${"a".repeat(243)}@example.com`, true, 12, {}]) {
    assert.equal(primaryContactEmail(schema, { email }), null);
  }
});

test("malformed and legacy schemas or answers do not produce a guessed contact", () => {
  for (const invalid of [null, [], { fields: schema.fields }, { version: 1, fields: [{ id: "email", type: "email" }] }, { ...schema, fields: [...schema.fields, schema.fields[1]] }]) {
    assert.equal(primaryContactEmail(invalid, { email: "one@example.com" }), null);
  }
  for (const invalid of [null, [], "one@example.com", 123]) assert.equal(primaryContactEmail(schema, invalid), null);
});
