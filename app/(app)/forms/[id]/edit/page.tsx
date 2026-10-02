import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { FormBuilder } from "@/components/form-builder";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { parseFormSchema } from "@/lib/forms/validate";
import { appUrl } from "@/lib/security";

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { organization } = await requireRole(Role.ADMIN);
  const { id } = await params;
  const form = await db.form.findFirst({ where: { id, organizationId: organization.id } });
  if (!form) notFound();
  return <div className="page"><PageHeader title="Edit form" description={form.name} /><FormBuilder baseUrl={appUrl()} initialForm={{ id, name: form.name, schema: parseFormSchema(form.schema), schemaVersion: form.schemaVersion, allowedOrigins: form.allowedOrigins }} /></div>;
}
