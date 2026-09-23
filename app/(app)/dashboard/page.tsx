import { ArrowRight, FileInput, Inbox, Radio } from "lucide-react";
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
  const { organization, user } = await getCurrentContext();
  const [forms, liveForms, submissions, recent] = await Promise.all([
    db.form.count({ where: { organizationId: organization.id } }),
    db.form.count({ where: { organizationId: organization.id, status: "LIVE" } }),
    db.submission.count({ where: { form: { organizationId: organization.id } } }),
    db.submission.findMany({ where: { form: { organizationId: organization.id } }, include: { form: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);

  return (
    <div className="page">
      <PageHeader eyebrow="Workspace overview" title={`Good ${new Date().getHours() < 12 ? "morning" : "to see you"}, ${user.name.split(" ")[0]}.`} description="A clear view of what your forms collected." action={<Link className="button button-primary" href="/forms/new">Create form <ArrowRight size={16} /></Link>} />
      <section className="stats-grid" aria-label="Workspace statistics">
        <article className="stat-card"><span className="stat-icon"><FileInput size={18} /></span><strong>{forms}</strong><p>Total forms</p></article>
        <article className="stat-card"><span className="stat-icon"><Radio size={18} /></span><strong>{liveForms}</strong><p>Live forms</p></article>
        <article className="stat-card"><span className="stat-icon"><Inbox size={18} /></span><strong>{submissions}</strong><p>Submissions</p></article>
      </section>
      <section className="panel">
        <div className="panel-header"><div><p className="eyebrow">Inbox</p><h2>Recent submissions</h2></div>{recent.length > 0 && <Link className="text-link" href="/submissions">View all <ArrowRight size={14} /></Link>}</div>
        {recent.length ? (
          <div className="list">
            {recent.map((submission) => <Link className="list-row" href={`/forms/${submission.form.id}#submissions`} key={submission.id}><span className="submission-dot" aria-hidden /><span className="list-main"><strong>{preview(submission.data)}</strong><small>{submission.form.name}</small></span><time>{submission.createdAt.toLocaleDateString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time><ArrowRight className="row-arrow" size={15} /></Link>)}
          </div>
        ) : <EmptyState title="No submissions yet" description="Create a form, add it to your website, and responses will arrive here." action={<Link className="button button-secondary" href="/forms/new">Create your first form</Link>} />}
      </section>
    </div>
  );
}
