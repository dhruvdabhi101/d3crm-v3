import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";

const database = `d3crm_migration_test_${randomBytes(6).toString("hex")}`;
const container = "d3crm-v3-postgres-1";
function sql(statement: string, name = database) {
  return execFileSync("docker", ["exec", "-i", container, "psql", "-U", "postgres", "-d", name, "-v", "ON_ERROR_STOP=1", "-At"], { input: statement, encoding: "utf8" });
}

sql(`CREATE DATABASE "${database}"`, "postgres");
try {
  const migrations = readdirSync(new URL("../prisma/migrations/", import.meta.url)).filter(name => /^\d/.test(name)).sort();
  const apply = (name: string) => sql(readFileSync(new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url), "utf8"));
  migrations.slice(0, 2).forEach(apply);
  sql(`
    INSERT INTO "User" (id, name, email, "passwordHash", "updatedAt") VALUES ('legacy-owner', 'Legacy Owner', 'legacy@example.test', 'fixture', now());
    INSERT INTO "Organization" (id, name, slug, "updatedAt") VALUES ('legacy-org', 'Legacy Workspace', 'legacy-workspace', now());
    INSERT INTO "OrganizationMember" (id, role, "userId", "organizationId") VALUES ('legacy-member', 'OWNER', 'legacy-owner', 'legacy-org');
    INSERT INTO "Form" (id, name, slug, schema, "keyPrefix", "keyHash", "organizationId", "updatedAt")
      VALUES ('legacy-form', 'Legacy Form', 'legacy-form', '{"version":1,"fields":[{"id":"name","label":"Original name","type":"text","required":true}]}', 'fixture', 'fixture', 'legacy-org', now());
    INSERT INTO "Submission" (id, data, "formId") VALUES ('legacy-enquiry', '{"name":"Preserved enquiry"}', 'legacy-form');
  `);
  migrations.slice(2).forEach(apply);
  assert.equal(sql(`SELECT data->>'name' FROM "Submission" WHERE id='legacy-enquiry'`).trim(), "Preserved enquiry");
  assert.equal(sql(`SELECT "schemaSnapshot"->'fields'->0->>'label' FROM "Submission" WHERE id='legacy-enquiry'`).trim(), "Original name");
  assert.equal(sql(`SELECT status FROM "Submission" WHERE id='legacy-enquiry'`).trim(), "NEW");
  assert.equal(sql(`SELECT "monthlySubmissions" FROM "Organization" WHERE id='legacy-org'`).trim(), "1");
  assert.equal(sql(`SELECT 'SKIPPED'::"DeliveryStatus"`).trim(), "SKIPPED");
  assert.equal(sql(`SELECT "firstContactedAt" IS NULL AND attribution IS NULL FROM "Submission" WHERE id='legacy-enquiry'`).trim(), "t");
  assert.equal(sql(`SELECT "assignmentMode" = 'NONE' AND "unassignedAlertMinutes" IS NULL AND "connectionCheckedAt" IS NULL FROM "Form" WHERE id='legacy-form'`).trim(), "t");
  assert.equal(sql(`SELECT NOT "isClient" AND "clientWebsite" IS NULL FROM "Organization" WHERE id='legacy-org'`).trim(), "t");
  console.log("Passed: existing enquiries, schema snapshots, defaults, and monthly usage survive all migrations.");
} finally {
  sql(`DROP DATABASE "${database}"`, "postgres");
}
