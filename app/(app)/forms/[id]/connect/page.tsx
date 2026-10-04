import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { IntegrationWizard } from "@/components/integration-wizard";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { parseFormSchema } from "@/lib/forms/validate";
import { appUrl } from "@/lib/security";

export default async function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { organization } = await requireRole(Role.ADMIN);
  const form = await db.form.findFirst({ where: { id: (await params).id, organizationId: organization.id }, include: { submissions: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } } });
  if (!form) notFound();
  return <div className="page"><Link className="text-link" href={`/forms/${form.id}`}><ArrowLeft size={15} />{form.name}</Link><PageHeader title="Connect website" description={form.name} /><IntegrationWizard id={form.id} name={form.name} endpoint={`${appUrl()}/api/v1/forms/${form.slug}/submissions`} schema={parseFormSchema(form.schema)} origins={form.allowedOrigins} keyPrefix={form.keyPrefix} checkedAt={form.connectionCheckedVersion === form.schemaVersion ? form.connectionCheckedAt?.toISOString() ?? null : null} latestAt={form.submissions[0]?.createdAt.toISOString() ?? null} /></div>;
}
