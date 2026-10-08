-- Existing accounts have no recorded acceptance; do not invent consent for them.
ALTER TABLE "User"
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
  ADD COLUMN "termsVersion" TEXT,
  ADD COLUMN "accountConsentAt" TIMESTAMP(3),
  ADD COLUMN "accountNoticeVersion" TEXT;
