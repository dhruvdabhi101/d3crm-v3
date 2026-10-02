CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');
ALTER TABLE "Organization" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "stripeCheckoutId" TEXT,
  ADD COLUMN "subscriptionStatus" TEXT;
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");
ALTER TABLE "Submission" ADD COLUMN "followUpNotifiedAt" TIMESTAMP(3);
ALTER TABLE "OutboundDelivery" ADD COLUMN "submissionId" TEXT;
ALTER TABLE "OutboundDelivery" ADD CONSTRAINT "OutboundDelivery_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "StripeEvent" ("id" TEXT NOT NULL PRIMARY KEY, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
