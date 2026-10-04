CREATE TABLE "ReplyTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReplyTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReplyTemplate_organizationId_name_key" ON "ReplyTemplate"("organizationId", "name");
ALTER TABLE "ReplyTemplate" ADD CONSTRAINT "ReplyTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
