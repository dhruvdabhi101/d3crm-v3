import assert from "node:assert/strict";
import test from "node:test";
import { historicalColumns } from "./history.ts";
const schema = (fields: { id: string; label: string }[]) => ({ version: 1, fields: fields.map(field => ({ ...field, type: "text", required: false })) });
test("historical table preserves removed fields, renamed labels, and answers without snapshots", () => {
  const columns = historicalColumns(schema([{ id: "name", label: "Your name" }, { id: "company", label: "Company" }]), [
    { schemaSnapshot: schema([{ id: "name", label: "Full name" }, { id: "message", label: "Message" }]), data: { name: "Alex", message: "Original answer" } },
    { schemaSnapshot: null, data: { legacy: "Preserved" } },
  ]);
  assert.deepEqual(columns, [{ id: "name", labels: ["Your name", "Full name"] }, { id: "company", labels: ["Company"] }, { id: "message", labels: ["Message"] }, { id: "legacy", labels: ["legacy"] }]);
});
