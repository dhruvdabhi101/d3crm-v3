import assert from "node:assert/strict";
import { test } from "node:test";
import { legalVersion } from "../legal.ts";
import { legalProfile } from "../legal-contact.ts";
import { registrationSchema } from "../registration.ts";

const account = { name: "Alex Morgan", email: "ALEX@EXAMPLE.TEST", password: "A-valid-password-2026", organization: "Alex’s workspace", acceptedTerms: true, accountConsent: true, legalVersion };

test("registration requires separate affirmative terms and account consent for the current revision", () => {
  const valid = registrationSchema.parse(account);
  assert.equal(valid.email, "alex@example.test");
  for (const field of ["acceptedTerms", "accountConsent"] as const) {
    for (const value of [undefined, false, "true", "on", 1]) assert.equal(registrationSchema.safeParse({ ...account, [field]: value }).success, false, `${field}: ${String(value)}`);
  }
  for (const value of [undefined, "2025-01-01", "2099-01-01"]) assert.equal(registrationSchema.safeParse({ ...account, legalVersion: value }).success, false);
  assert.equal(registrationSchema.safeParse({ ...account, password: "x".repeat(73) }).success, false);
});

test("registration readiness requires a complete public operator and infrastructure disclosure", () => {
  const env = { LEGAL_OPERATOR_NAME: "Test Operator Ltd", LEGAL_OPERATOR_ADDRESS: "10 Test Street, India", LEGAL_CONTACT_EMAIL: "privacy@operator.in", LEGAL_GRIEVANCE_CONTACT: "Privacy officer", LEGAL_INFRASTRUCTURE_PROVIDERS: "Test hosting and database providers", LEGAL_PROCESSING_LOCATIONS: "India" };
  assert.ok(legalProfile(env));
  for (const field of Object.keys(env)) assert.equal(legalProfile({ ...env, [field]: "" }), null, field);
  for (const email of ["invalid", "privacy@example.com", "privacy@operator.test", "privacy@operator.invalid"]) assert.equal(legalProfile({ ...env, LEGAL_CONTACT_EMAIL: email }), null);
});
