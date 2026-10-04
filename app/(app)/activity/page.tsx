import { Role } from "@prisma/client";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { activityLabel } from "@/lib/activity";
import { db } from "@/lib/db";
import { pageNumber } from "@/lib/leads";
import { requireRole } from "@/lib/permissions";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { organization } = await requireRole(Role.ADMIN);
  const params = await searchParams;
  const category = typeof params.category === "string" && ["lead", "form", "member", "organization"].includes(params.category) ? params.category : "";
  const where = { organizationId: organization.id, ...(category ? { action: { startsWith: `${category}.` } } : {}) };
  const count = await db.activity.count({ where });
  const pages = Math.max(1, Math.ceil(count / 30)); const page = Math.min(pageNumber(typeof params.page === "string" ? params.page : ""), pages);
  const entries = await db.activity.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 30, skip: (page - 1) * 30, include: { actor: { select: { name: true } } } });
  const href = (target: number) => `/activity?${new URLSearchParams({ category, page: String(target) })}`;
  return <div className="page"><PageHeader title="Activity" description={`${count.toLocaleString()} events · ${organization.name}`} />
    <form className="activity-filters" method="get"><label className="field"><span>Category</span><select name="category" defaultValue={category}><option value="">All activity</option><option value="lead">Enquiries</option><option value="form">Forms</option><option value="member">Team</option><option value="organization">Workspace</option></select></label><button className="button button-secondary"><Filter size={15} />Apply</button></form>
    <ol className="activity-list">{entries.map(entry => <li key={entry.id}><div><strong>{activityLabel(entry)}</strong><span>{entry.actor?.name ?? (["lead.created", "form.connection_checked", "lead.auto_assigned"].includes(entry.action) ? "Website" : "Former team member")}{entry.submissionId && <> · <Link className="text-link" href={`/submissions/${entry.submissionId}`}>Open enquiry</Link></>}</span></div><time>{entry.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</time></li>)}</ol>
    {!entries.length && <p className="quiet-note">No activity recorded.</p>}
    <nav className="pagination" aria-label="Activity pages">{page > 1 ? <Link className="icon-button" href={href(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></Link> : <span />}<span>Page {page} of {pages}</span>{page < pages ? <Link className="icon-button" href={href(page + 1)} aria-label="Next page"><ChevronRight size={18} /></Link> : <span />}</nav>
  </div>;
}
