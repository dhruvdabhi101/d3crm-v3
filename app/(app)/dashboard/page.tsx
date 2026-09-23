import { ArrowRight, ArrowUpRight, Code2, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";

function preview(data: unknown) {
  const values = Object.values((data ?? {}) as Record<string, unknown>).filter((value) => typeof value === "string" && value);
  return values.slice(0, 2).join(" · ") || "Submission received";
}

export default async function DashboardPage() {
  const { organization, user, membership } = await getCurrentContext();
  const canAdmin = ["OWNER", "ADMIN"].includes(membership.role);
  const [forms, liveForms, submissions, recent] = await Promise.all([
    db.form.count({ where: { organizationId: organization.id } }),
    db.form.count({ where: { organizationId: organization.id, status: "LIVE" } }),
    db.submission.count({ where: { form: { organizationId: organization.id } } }),
    db.submission.findMany({ where: { form: { organizationId: organization.id } }, include: { form: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  return <div className="page overview-page">
    <PageHeader eyebrow="Overview" title={`Hello, ${user.name.split(" ")[0]}.`} description="A little space for every conversation." action={canAdmin ? <Link className="button button-primary" href="/forms/new"><Plus size={16} />Create form</Link> : undefined} />
    <section className="stats-grid" aria-label="Workspace statistics">
      <Link className="stat-card" href="/submissions"><p>Total responses <ArrowUpRight size={14} /></p><strong>{submissions.toLocaleString()}</strong><small>Collected in your workspace</small></Link>
      <Link className="stat-card" href="/forms"><p>Live forms <span className="live-dot" /></p><strong>{liveForms.toLocaleString()}</strong><small>Ready to receive responses</small></Link>
      <Link className="stat-card" href="/forms"><p>All forms <ArrowUpRight size={14} /></p><strong>{forms.toLocaleString()}</strong><small>Across your websites</small></Link>
    </section>
    <div className={canAdmin ? "overview-grid" : ""}>
      <section className="panel inbox-panel"><div className="panel-header"><div><h2>Recent responses</h2><p className="panel-description">Your latest conversations, all together.</p></div><Link className="text-link" href="/submissions">View inbox <ArrowUpRight size={14} /></Link></div>
        {recent.length ? <div className="list">{recent.map(submission => <Link className="list-row" href={`/forms/${submission.form.id}#submissions`} key={submission.id}><span className="submission-dot" aria-hidden /><span className="list-main"><strong>{preview(submission.data)}</strong><small>{submission.form.name}</small></span><time>{submission.createdAt.toLocaleDateString("en", { month: "short", day: "numeric" })}</time><ArrowRight className="row-arrow" size={15} /></Link>)}</div> : <EmptyState title="Ready for your first hello." description="When someone fills out your form, their response will appear here." action={canAdmin ? <Link className="text-link" href={forms ? "/forms" : "/forms/new"}>{forms ? "Connect a form" : "Create your first form"} <ArrowRight size={14} /></Link> : undefined} />}
      </section>
      {canAdmin && <aside className="getting-started"><span className="feature-icon"><Code2 size={21} strokeWidth={1.5} /></span><h2>Bring your own AI.</h2><p>Go from an idea to a working form with the agent you already use.</p><ol className="workflow-steps"><li><span>1</span><div><strong>Describe your form</strong><p>We’ll prepare a prompt for your agent.</p></div></li><li><span>2</span><div><strong>Make it yours</strong><p>Import the result and review every field.</p></div></li><li><span>3</span><div><strong>Connect your website</strong><p>Copy the instructions. Let your agent build.</p></div></li></ol><Link className="button button-secondary" href="/forms/new?mode=ai">Start with a prompt <ArrowUpRight size={14} /></Link><span className="compatible-note">Works with Codex, Claude, Cursor & more</span></aside>}
    </div>
    <footer className="workspace-footer"><span>d3CRM</span><span>Your forms. Your website. Your workflow.</span></footer>
  </div>;
}
