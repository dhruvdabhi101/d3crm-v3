
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";
import { Role } from "@prisma/client";

export default async function FormsPage() {
  const { organization, membership } = await getCurrentContext();
  const canAdmin = membership.role === Role.OWNER || membership.role === Role.ADMIN;
  const forms = await db.form.findMany({ where: { organizationId: organization.id }, include: { _count: { select: { submissions: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <div className="page">
      <PageHeader eyebrow="Workspace" title="Forms" description="A home for the forms on your websites." action={canAdmin ? <Button asChild variant="default"><Link className="button button-primary" href="/forms/new"><Plus size={16} />New form</Link></Button> : undefined} />
      {forms.length ? <div className="card-grid">{forms.map((form) => (
        <Link className="form-card" href={`/forms/${form.id}`} key={form.id}>
          <div className="form-card-top"><span className="form-glyph" aria-hidden><i /><i /><i /></span><StatusPill status={form.status} /></div>
          <div><h2>{form.name}</h2><p>{form._count.submissions} {form._count.submissions === 1 ? "submission" : "submissions"}</p></div>
          <div className="form-card-bottom"><code>{form.keyPrefix}••••</code><ArrowRight size={16} /></div>
        </Link>
      ))}</div> : <div className="panel"><EmptyState title="Your forms will live here" description="Start with the fields you need. You can connect it to any website in a few lines." action={canAdmin ? <Button asChild variant="default"><Link className="button button-primary" href="/forms/new"><Plus size={16} />Create form</Link></Button> : undefined} /></div>}
    </div>
  );
}
