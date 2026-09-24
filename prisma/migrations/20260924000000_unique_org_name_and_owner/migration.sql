CREATE UNIQUE INDEX "Organization_name_normalized_key" ON "Organization" (lower(btrim("name")));
CREATE UNIQUE INDEX "Organization_one_owner_key" ON "OrganizationMember" ("organizationId") WHERE "role" = 'OWNER';
