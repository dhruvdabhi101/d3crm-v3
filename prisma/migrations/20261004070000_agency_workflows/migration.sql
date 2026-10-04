ALTER TABLE "Organization" ADD COLUMN "isClient" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "clientWebsite" TEXT;
CREATE TYPE "AssignmentMode" AS ENUM ('NONE', 'DEFAULT', 'ROUND_ROBIN');
ALTER TABLE "Form"
  ADD COLUMN "assignmentMode" "AssignmentMode" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "defaultAssigneeId" TEXT,
  ADD COLUMN "assignmentMemberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "assignmentCursor" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "unassignedAlertMinutes" INTEGER,
  ADD COLUMN "connectionCheckedAt" TIMESTAMP(3),
  ADD COLUMN "connectionCheckedVersion" INTEGER;
ALTER TABLE "Submission" ADD COLUMN "unassignedNotifiedAt" TIMESTAMP(3);
CREATE INDEX "Submission_unassigned_queue_idx" ON "Submission"("createdAt") WHERE "assigneeId" IS NULL AND "status" = 'NEW' AND "unassignedNotifiedAt" IS NULL;
