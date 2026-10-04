import assert from "node:assert/strict";
import { test } from "node:test";
import { expandReply, replyContext, replyInput, replyMailto, REPLY_PRESETS } from "../replies.ts";

test("reply templates validate lengths, headers, and supported variables", () => {
  for (const preset of REPLY_PRESETS) assert.deepEqual(replyInput(preset), preset);
  const valid = { name: "Thanks", subject: "Hello {{name}}", body: "Hi {{ name }},\n\n{{sender_name}}" };
  assert.equal(replyInput(valid).name, "Thanks");
  for (const input of [
    { ...valid, name: "" }, { ...valid, subject: "Hello\r\nBcc: attacker@example.test" },
    { ...valid, subject: "x".repeat(201) }, { ...valid, body: "x".repeat(5001) },
    { ...valid, body: "{{private_notes}}" }, { ...valid, body: "a\0b" },
  ]) assert.throws(() => replyInput(input), { status: 400 });
});

test("reply expansion is one-pass, bounded, and does not infer absent contact names", () => {
  const context = replyContext({ name: "Ada\nBcc: unwanted" }, "Contact", "Studio", "Owner");
  assert.equal(context.name, "Ada Bcc: unwanted");
  assert.equal(replyContext({ email: "private@example.test" }, "Contact", "Studio", "Owner").name, "there");
  assert.deepEqual(expandReply({ subject: "Hi {{name}}", body: "Hello {{name}} from {{workspace_name}}" }, { ...context, name: "{{sender_name}}" }), { subject: "Hi {{sender_name}}", body: "Hello {{sender_name}} from Studio" });
});

test("native drafts percent-encode single recipients and body; never add arbitrary headers", () => {
  const url = replyMailto("ada+studio@example.test", "Quote & next steps?", "Line one\nLine two & hello");
  assert.ok(url.startsWith("mailto:ada%2Bstudio%40example.test?"));
  const params = new URLSearchParams(url.split("?")[1]);
  assert.equal(params.get("subject"), "Quote & next steps?");
  assert.equal(params.get("body"), "Line one\r\nLine two & hello");
  assert.deepEqual([...params.keys()], ["subject", "body"]);
  for (const email of ["a@example.test,b@example.test", "a@example.test;evil@example.test", "a@example.test\r\nBcc:x@example.test"]) assert.throws(() => replyMailto(email, "Hello", "Message"), { status: 400 });
  assert.throws(() => replyMailto("a@example.test", "Hello\nBcc:x", "Message"), { status: 400 });
});
