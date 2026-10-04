import assert from "node:assert/strict";
import { test } from "node:test";
import { requestBulkUpdate } from "../bulk-update-request.ts";

test("bulk JSON requests preserve the versioned payload and report only confirmed outcomes", async () => {
  const previousFetch = globalThis.fetch;
  const data = new FormData();
  const payload = JSON.stringify({ items: [{ id: "enquiry", updatedAt: "2026-10-04T00:00:00.000Z" }], change: { kind: "read", value: true } });
  data.set("payload", payload);
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "/api/submissions/bulk");
      assert.equal(init?.method, "POST");
      assert.equal(new Headers(init?.headers).get("Content-Type"), "application/json");
      assert.equal(init?.body, payload);
      return Response.json({ success: "Saved 1 enquiry." });
    };
    assert.deepEqual(await requestBulkUpdate(data), { success: "Saved 1 enquiry." });
    globalThis.fetch = async () => Response.json({ error: "An enquiry changed." }, { status: 409 });
    assert.deepEqual(await requestBulkUpdate(data), { error: "An enquiry changed." });
  } finally { globalThis.fetch = previousFetch; }
});

test("bulk requests never report success for failed, redirected or malformed responses", async () => {
  const previousFetch = globalThis.fetch;
  const data = new FormData(); data.set("payload", "{}");
  try {
    for (const response of [Response.json({ success: "Not confirmed" }, { status: 500 }), Response.json({}), new Response("<html>Sign in</html>")]) {
      globalThis.fetch = async () => response;
      await assert.rejects(() => requestBulkUpdate(data));
    }
    globalThis.fetch = async () => { throw new Error("Offline"); };
    await assert.rejects(() => requestBulkUpdate(data), /Offline/);
  } finally { globalThis.fetch = previousFetch; }
});
