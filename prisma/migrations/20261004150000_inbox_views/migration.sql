CREATE TABLE "SavedInboxView" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedInboxView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedInboxView_userId_organizationId_name_key" ON "SavedInboxView"("userId", "organizationId", "name");
ALTER TABLE "SavedInboxView" ADD CONSTRAINT "SavedInboxView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavedInboxView" ADD CONSTRAINT "SavedInboxView_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
