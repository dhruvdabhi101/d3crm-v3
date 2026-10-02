ALTER TABLE "Organization" ADD COLUMN "usageMonth" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "monthlySubmissions" INTEGER NOT NULL DEFAULT 0;
UPDATE "Organization" o SET "usageMonth" = date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
  "monthlySubmissions" = (SELECT count(*) FROM "Submission" s JOIN "Form" f ON f.id = s."formId"
    WHERE f."organizationId" = o.id AND s."createdAt" >= date_trunc('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC'));
