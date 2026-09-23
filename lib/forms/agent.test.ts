import assert from "node:assert/strict";
import test from "node:test";
import { buildDesignPrompt, buildIntegrationPrompt, parseAgentForm } from "./agent.ts";
const definition = { name: "Contact", schema: { version: 1 as const, fields: [{ id: "email", label: "Email", type: "email" as const, required: true }] } };
test("imports agent JSON and fenced responses; rejects invalid contracts without changing them", () => {
  assert.deepEqual(parseAgentForm(JSON.stringify(definition)), definition);
  assert.deepEqual(parseAgentForm('```json\n' + JSON.stringify(definition) + '\n```'), definition);
  for (const value of ["null", "[]", "not json", JSON.stringify({ ...definition, name: "" }), JSON.stringify({ name: "Test", schema: { version: 1, fields: [...definition.schema.fields, ...definition.schema.fields] } }), JSON.stringify({ name: "Test", schema: { version: 1, fields: [{ id: "file", label: "File", type: "file", required: false }] } })]) assert.throws(() => parseAgentForm(value));
  assert.throws(() => parseAgentForm(" ".repeat(64001)), /64 KB/);
});
test("handoff includes exact schema and endpoint, actual key only when available, and API behavior", () => {
  const config = { ...definition, endpoint: "https://crm.test/api/v1/forms/contact/submissions", origins: ["https://website.test"] };
  const prompt = buildIntegrationPrompt(config);
  assert.ok(prompt.includes(config.endpoint));
  assert.ok(prompt.includes('"id": "email"'));
  assert.ok(prompt.includes("YOUR_FORM_KEY"));
  assert.ok(prompt.includes("https://website.test"));
  assert.ok(prompt.includes("422"));
  assert.ok(prompt.includes("_gotcha"));
  assert.ok(buildIntegrationPrompt({ ...config, key: "d3f_example" }).includes('"X-Form-Key": "d3f_example"'));
  assert.ok(buildDesignPrompt("A waitlist").includes("A waitlist"));
});
