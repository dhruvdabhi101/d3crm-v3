import assert from "node:assert/strict";
import { test } from "node:test";
import type { Prisma } from "@prisma/client";
import { duplicateFormInWorkspace } from "./duplicate.ts";
import { hashFormKey } from "../keys.ts";
import { RequestError } from "../security.ts";

function transaction({ authorized = true, exists = true } = {}) {
  const created: Prisma.FormCreateArgs["data"][] = [];
  const activities: Prisma.ActivityCreateArgs["data"][] = [];
  const memberships: Prisma.OrganizationMemberFindFirstArgs[] = [];
  const sources: Prisma.FormFindFirstArgs[] = [];
  const calls: string[] = [];
  const source = {
    schema: { version: 1, fields: [{ id: "email", label: "Email", type: "email", required: true }] },
    allowedOrigins: ["https://client.example"],
    keyHash: "old-hash", slug: "old-form", status: "LIVE", notificationEmails: ["old@example.com"],
    webhookUrl: "https://hooks.example", webhookSecret: "old-secret", assignmentMode: "ROUND_ROBIN",
    assignmentMemberIds: ["previous-user"], defaultAssigneeId: "previous-user", connectionCheckedAt: new Date(),
  };
  const tx = {
    $queryRaw: async () => { calls.push("lock"); return [{ id: "workspace", plan: "FREE", usageMonth: new Date(), monthlySubmissions: 0 }]; },
    organizationMember: { findFirst: async (args: Prisma.OrganizationMemberFindFirstArgs) => { calls.push("membership"); memberships.push(args); return authorized ? { userId: "actor" } : null; } },
    form: {
      findFirst: async (args: Prisma.FormFindFirstArgs) => { calls.push("source"); sources.push(args); return exists ? source : null; },
      count: async () => 0,
      create: async ({ data }: Prisma.FormCreateArgs) => { calls.push("create"); created.push(data); return { ...data, id: `copy-${created.length}` }; },
    },
    activity: { create: async ({ data }: Prisma.ActivityCreateArgs) => { activities.push(data); return data; } },
  } as unknown as Prisma.TransactionClient;
  return { tx, created, activities, memberships, sources, calls, source };
}

test("form duplication copies only the field contract and origins, with a fresh draft and one-time key", async () => {
  const fixture = transaction();
  const copy = await duplicateFormInWorkspace(fixture.tx, "workspace", "actor", "source", "  Client enquiry  ");
  const next = await duplicateFormInWorkspace(fixture.tx, "workspace", "actor", "source", "Client enquiry");
  assert.equal(copy.name, "Client enquiry");
  assert.deepEqual(copy.schema, fixture.source.schema);
  assert.deepEqual(copy.allowedOrigins, ["https://client.example"]);
  assert.match(copy.key, /^d3f_/);
  assert.notEqual(copy.key, next.key);
  assert.notEqual(copy.slug, next.slug);
  assert.deepEqual(fixture.calls.slice(0, 3), ["lock", "membership", "source"]);
  assert.deepEqual(fixture.memberships[0].where, { organizationId: "workspace", userId: "actor", role: { in: ["OWNER", "ADMIN"] }, user: { emailVerifiedAt: { not: null } } });
  assert.deepEqual(fixture.sources[0].where, { id: "source", organizationId: "workspace" });
  const data = fixture.created[0];
  assert.equal(data.status, "DRAFT");
  assert.equal(data.keyHash, hashFormKey(copy.key));
  assert.deepEqual(Object.keys(data).sort(), ["allowedOrigins", "keyHash", "keyPrefix", "name", "organizationId", "schema", "slug", "status"]);
  assert.equal(fixture.activities[0].action, "form.duplicated");
  assert.deepEqual(fixture.activities[0].details, { sourceFormId: "source" });
  assert.ok(!JSON.stringify(fixture.activities).includes(copy.key));
});

test("form duplication rejects invalid names, stale access, unknown forms and invalid source schemas", async () => {
  const invalid = transaction();
  await assert.rejects(duplicateFormInWorkspace(invalid.tx, "workspace", "actor", "source", "x"), error => error instanceof RequestError && error.status === 400);
  assert.equal(invalid.calls.length, 0);
  for (const name of ["OWNER access lost", "VIEWER", "Unverified"]) {
    const fixture = transaction({ authorized: false });
    await assert.rejects(duplicateFormInWorkspace(fixture.tx, "workspace", "actor", "source", name), error => error instanceof RequestError && error.status === 403);
    assert.equal(fixture.created.length, 0);
    assert.deepEqual(fixture.calls, ["lock", "membership"]);
  }
  const missing = transaction({ exists: false });
  await assert.rejects(duplicateFormInWorkspace(missing.tx, "workspace", "actor", "foreign-form", "Copy"), error => error instanceof RequestError && error.status === 404);
  assert.equal(missing.created.length, 0);
  const malformed = transaction(); malformed.source.schema.fields = [];
  await assert.rejects(duplicateFormInWorkspace(malformed.tx, "workspace", "actor", "source", "Copy"), error => error instanceof RequestError && error.status === 422);
  assert.equal(malformed.created.length, 0);
});
