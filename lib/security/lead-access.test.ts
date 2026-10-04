import assert from "node:assert/strict";
import { test } from "node:test";
import type { LeadStatus, Prisma, Role } from "@prisma/client";
import { addLeadNote, removeLead, saveLead } from "../lead-workflow.ts";

function transaction({ role = "MEMBER" as Role | null, exists = true } = {}) {
  const calls: string[] = [];
  const memberships: Prisma.OrganizationMemberFindFirstArgs[] = [];
  const lookups: Prisma.SubmissionFindFirstArgs[] = [];
  const updates: Prisma.SubmissionUpdateManyArgs[] = [];
  const deletions: Prisma.SubmissionDeleteManyArgs[] = [];
  const notes: Prisma.SubmissionNoteCreateArgs["data"][] = [];
  const activities: Prisma.ActivityCreateArgs["data"][] = [];
  const lead = { id: "lead", status: "NEW" as LeadStatus, assigneeId: null, readAt: null, followUpAt: null, firstContactedAt: null, updatedAt: new Date("2026-10-04T12:00:00.000Z") };
  const tx = {
    $queryRaw: async () => { calls.push("lock"); return [{ id: "workspace" }]; },
    organizationMember: { findFirst: async (args: Prisma.OrganizationMemberFindFirstArgs) => {
      calls.push("membership"); memberships.push(args);
      const roles = (args.where?.role as { in: Role[] }).in;
      return role && roles.includes(role) ? { userId: "actor", role } : null;
    } },
    submission: {
      findFirst: async (args: Prisma.SubmissionFindFirstArgs) => { calls.push("lead"); lookups.push(args); return exists ? lead : null; },
      updateMany: async (args: Prisma.SubmissionUpdateManyArgs) => {
        calls.push("update"); updates.push(args);
        lead.updatedAt = args.data.updatedAt as Date;
        lead.status = args.data.status as LeadStatus;
        return { count: 1 };
      },
      deleteMany: async (args: Prisma.SubmissionDeleteManyArgs) => { calls.push("delete"); deletions.push(args); return { count: exists ? 1 : 0 }; },
    },
    submissionNote: { create: async ({ data }: Prisma.SubmissionNoteCreateArgs) => { calls.push("note"); notes.push(data); return data; } },
    activity: { create: async ({ data }: Prisma.ActivityCreateArgs) => { calls.push("activity"); activities.push(data); return data; } },
  } as unknown as Prisma.TransactionClient;
  return { tx, calls, memberships, lookups, updates, deletions, notes, activities, lead };
}

test("note writes recheck current write access under the workspace lock", async () => {
  for (const role of [null, "VIEWER"] as const) {
    const fixture = transaction({ role });
    await assert.rejects(addLeadNote(fixture.tx, "workspace", "actor", "lead", "Private note"), { status: 403 });
    assert.deepEqual(fixture.calls, ["lock", "membership"]);
    assert.equal(fixture.notes.length, 0);
    assert.equal(fixture.activities.length, 0);
  }
  for (const role of ["OWNER", "ADMIN", "MEMBER"] as const) {
    const fixture = transaction({ role });
    await addLeadNote(fixture.tx, "workspace", "actor", "lead", "Private note");
    assert.deepEqual(fixture.calls, ["lock", "membership", "lead", "note", "activity"]);
    assert.deepEqual(fixture.memberships[0].where, { organizationId: "workspace", userId: "actor", role: { in: ["OWNER", "ADMIN", "MEMBER"] } });
    assert.deepEqual(fixture.lookups[0].where, { id: "lead", form: { organizationId: "workspace" } });
    assert.equal(fixture.notes[0].body, "Private note");
    assert.ok(!JSON.stringify(fixture.activities).includes("Private note"));
  }
});

test("delete writes recheck owner or admin access and stay tenant scoped", async () => {
  for (const role of [null, "VIEWER", "MEMBER"] as const) {
    const fixture = transaction({ role });
    await assert.rejects(removeLead(fixture.tx, "workspace", "actor", "lead"), { status: 403 });
    assert.deepEqual(fixture.calls, ["lock", "membership"]);
    assert.equal(fixture.deletions.length, 0);
    assert.equal(fixture.activities.length, 0);
  }
  for (const role of ["OWNER", "ADMIN"] as const) {
    const fixture = transaction({ role });
    await removeLead(fixture.tx, "workspace", "actor", "lead");
    assert.deepEqual(fixture.calls, ["lock", "membership", "delete", "activity"]);
    assert.deepEqual(fixture.deletions[0].where, { id: "lead", form: { organizationId: "workspace" } });
    assert.equal(fixture.activities[0].action, "lead.deleted");
    assert.equal(fixture.activities[0].subjectId, "lead");
  }
});

test("missing or foreign enquiries do not leave notes or misleading delete activity", async () => {
  const fixture = transaction({ role: "OWNER", exists: false });
  await assert.rejects(addLeadNote(fixture.tx, "workspace", "actor", "foreign-lead", "Private note"), { status: 404 });
  await removeLead(fixture.tx, "workspace", "actor", "foreign-lead");
  assert.equal(fixture.notes.length, 0);
  assert.equal(fixture.activities.length, 0);
  assert.deepEqual(fixture.lookups[0].where, { id: "foreign-lead", form: { organizationId: "workspace" } });
  assert.deepEqual(fixture.deletions[0].where, { id: "foreign-lead", form: { organizationId: "workspace" } });
});

test("changed saves advance the enquiry version even in the same millisecond", async t => {
  const fixture = transaction();
  const previous = fixture.lead.updatedAt;
  t.mock.method(Date, "now", () => previous.getTime());
  const input = { status: "QUALIFIED" as const, assigneeId: null, followUpAt: null, updatedAt: previous, unread: true };
  await saveLead(fixture.tx, "workspace", "actor", "lead", input);
  assert.equal(fixture.lead.updatedAt.getTime(), previous.getTime() + 1);
  assert.equal(fixture.activities.length, 1);
  await assert.rejects(saveLead(fixture.tx, "workspace", "actor", "lead", { ...input, status: "LOST" }), { status: 409 });
  assert.equal(fixture.updates.length, 1);
  assert.equal(fixture.activities.length, 1);
});

test("no-op saves keep the existing version and omit activity", async () => {
  const fixture = transaction();
  const previous = fixture.lead.updatedAt;
  await saveLead(fixture.tx, "workspace", "actor", "lead", { status: "NEW", assigneeId: null, followUpAt: null, updatedAt: previous, unread: true });
  assert.equal(fixture.lead.updatedAt, previous);
  assert.equal(fixture.updates.length, 0);
  assert.equal(fixture.activities.length, 0);
});
