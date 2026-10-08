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
      VALUES ('legacy-form', 'Legacy Form', 'legacy-form', '{"version":1,"fields":[{"id":"name","label":"Original name","type":"text","required":true},{"id":"email","label":"Original email","type":"email","required":false}]}', 'fixture', 'fixture', 'legacy-org', now());
    INSERT INTO "Submission" (id, data, "formId") VALUES ('legacy-enquiry', '{"name":"Preserved enquiry","email":"LEGACY@Example.Test"}', 'legacy-form');
  `);
  migrations.slice(2).forEach(name => {
    if (name === "20261004170000_lead_contact_email") sql(`
      UPDATE "Form" SET schema='{"version":1,"fields":[{"id":"alternate_email","label":"Current email","type":"email","required":false}]}' WHERE id='legacy-form';
      INSERT INTO "Submission" (id, data, "formId", "schemaSnapshot") VALUES
        ('fallback-contact', '{"alternate_email":"CURRENT@Example.Test"}', 'legacy-form', NULL),
        ('json-null-contact', '{"alternate_email":"CURRENT@Example.Test"}', 'legacy-form', 'null'),
        ('malformed-contact', '{"email":"legacy@example.test","alternate_email":"current@example.test"}', 'legacy-form', '{"version":1,"fields":[]}'),
        ('text-contact', '{"email":"legacy@example.test"}', 'legacy-form', '{"version":1,"fields":[{"id":"email","label":"Text","type":"text","required":false}]}'),
        ('ambiguous-contact', '{"email":"one@example.test,two@example.test"}', 'legacy-form', '{"version":1,"fields":[{"id":"email","label":"Email","type":"email","required":false}]}'),
        ('object-contact', '{"email":{"address":"one@example.test"}}', 'legacy-form', '{"version":1,"fields":[{"id":"email","label":"Email","type":"email","required":false}]}'),
        ('first-contact', '{"one":"FIRST@Example.Test","two":"second@example.test"}', 'legacy-form', '{"version":1,"fields":[{"id":"one","label":"First email","type":"email","required":false},{"id":"two","label":"Second email","type":"email","required":false}]}');
    `);
    apply(name);
  });
  assert.equal(sql(`SELECT data->>'name' FROM "Submission" WHERE id='legacy-enquiry'`).trim(), "Preserved enquiry");
  assert.equal(sql(`SELECT "schemaSnapshot"->'fields'->0->>'label' FROM "Submission" WHERE id='legacy-enquiry'`).trim(), "Original name");
  assert.equal(sql(`SELECT status FROM "Submission" WHERE id='legacy-enquiry'`).trim(), "NEW");
  assert.equal(sql(`SELECT "monthlySubmissions" FROM "Organization" WHERE id='legacy-org'`).trim(), "1");
  assert.equal(sql(`SELECT 'SKIPPED'::"DeliveryStatus"`).trim(), "SKIPPED");
  assert.equal(sql(`SELECT "firstContactedAt" IS NULL AND attribution IS NULL FROM "Submission" WHERE id='legacy-enquiry'`).trim(), "t");
  assert.equal(sql(`SELECT "assignmentMode" = 'NONE' AND "unassignedAlertMinutes" IS NULL AND "connectionCheckedAt" IS NULL FROM "Form" WHERE id='legacy-form'`).trim(), "t");
  assert.equal(sql(`SELECT NOT "isClient" AND "clientWebsite" IS NULL FROM "Organization" WHERE id='legacy-org'`).trim(), "t");
  assert.equal(sql(`SELECT count(*) FROM "SavedInboxView"`).trim(), "0");
  assert.equal(sql(`SELECT "contactEmail" FROM "Submission" WHERE id='legacy-enquiry'`).trim(), "legacy@example.test");
  assert.equal(sql(`SELECT count(*) FROM "Submission" WHERE id IN ('fallback-contact','json-null-contact') AND "contactEmail"='current@example.test'`).trim(), "2");
  assert.equal(sql(`SELECT count(*) FROM "Submission" WHERE id IN ('malformed-contact','text-contact','ambiguous-contact','object-contact') AND "contactEmail" IS NULL`).trim(), "4");
  assert.equal(sql(`SELECT "contactEmail" FROM "Submission" WHERE id='first-contact'`).trim(), "first@example.test");
  assert.equal(sql(`SELECT count(*) FROM "ReplyTemplate"`).trim(), "0");
  assert.equal(sql(`SELECT "termsAcceptedAt" IS NULL AND "termsVersion" IS NULL AND "accountConsentAt" IS NULL AND "accountNoticeVersion" IS NULL FROM "User" WHERE id='legacy-owner'`).trim(), "t");
  console.log("Passed: existing enquiries, schema snapshots, safe contact backfills, defaults, and monthly usage survive all migrations.");
} finally {
  sql(`DROP DATABASE "${database}"`, "postgres");
}
