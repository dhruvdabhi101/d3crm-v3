import assert from "node:assert/strict";
import { test } from "node:test";
import { Script } from "node:vm";
import { sampleAnswers, websiteSnippet } from "./integration.ts";
import { clientInput } from "../workspaces.ts";
import { routingInput } from "../assignment.ts";
import type { FormSchema } from "./types.ts";

test("client creation validates website origins and routing rejects invalid selections", () => {
  assert.deepEqual(clientInput(" Client ", "https://client.example/contact?secret=x"), { name: "Client", clientWebsite: "https://client.example" });
  for (const website of ["javascript:alert(1)", "https://name:password@client.example", "invalid"]) assert.throws(() => clientInput("Client", website));
  assert.throws(() => clientInput("x", ""));
  const data = new FormData(); data.set("assignmentMode", "ROUND_ROBIN");
  assert.throws(() => routingInput(data));
  data.append("assignmentMemberIds", "b"); data.append("assignmentMemberIds", "a"); data.append("assignmentMemberIds", "a"); data.set("unassignedAlertMinutes", "60");
  assert.deepEqual(routingInput(data), { assignmentMode: "ROUND_ROBIN", defaultAssigneeId: null, assignmentMemberIds: ["a", "b"], unassignedAlertMinutes: 60 });
  data.set("unassignedAlertMinutes", "-1"); assert.throws(() => routingInput(data));
});

test("generated integration code is valid JavaScript, escapes HTML and separates test/live endpoints", () => {
  const schema: FormSchema = { version: 1, fields: [
    { id: "name", label: '</script><img src=x onerror="alert(1)">', type: "text", required: true, maxLength: 5 },
    { id: "email", label: "Email", type: "email", required: true },
    { id: "quantity", label: "Quantity", type: "number", required: true },
    { id: "consent", label: "Consent", type: "checkbox", required: true },
    { id: "option", label: "Option", type: "select", options: ["<script>"], required: true },
  ] };
  assert.deepEqual(sampleAnswers(schema), { name: "Test ", email: "test@example.com", quantity: 1, consent: true, option: "<script>" });
  const config = { endpoint: "https://crm.example/api/v1/forms/contact/submissions", key: "publishable", name: "Contact", schema, formId: "contact", format: "javascript" as const, test: true };
  const js = websiteSnippet(config); new Script(js);
  assert.ok(js.includes('/verify') && !js.includes('</script>'));
  assert.ok(js.includes('pending || !form.reportValidity()') && js.includes('reply.fields') && js.includes('disabled[index]'));
  const markup = websiteSnippet({ ...config, format: "html", test: false });
  assert.ok(markup.includes('/submissions') && markup.includes('&lt;/script&gt;') && markup.includes('type="checkbox"'));
  assert.equal(markup.split('</script>').length, 2);
  assert.ok(markup.includes('maxlength="5"') && markup.includes('step="any"'));
});
