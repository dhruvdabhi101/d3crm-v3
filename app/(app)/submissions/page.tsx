import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { InboxResults, PipelineMove, type InboxLead } from "@/components/inbox-results";
import { InboxViews } from "@/components/inbox-views";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List, Search, SlidersHorizontal } from "lucide-react";
import { LEAD_STATUSES, pageNumber, statusLabel } from "@/lib/leads";
import { inboxFilters, inboxLink } from "@/lib/inbox-filters";

function renderValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "-");
}

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { organization, user, membership } = await getCurrentContext();
  const params = await searchParams;
  const filters = inboxFilters(params);
  const { q, status, form: formId, view, sort, layout } = filters;
  const requestedPage = pageNumber(typeof params.page === "string" ? params.page : undefined);
  const canWrite = membership.role !== "VIEWER";
  const matched = q ? await db.$queryRaw<{ id: string }[]>`SELECT s.id FROM "Submission" s JOIN "Form" f ON f.id = s."formId" WHERE f."organizationId" = ${organization.id} AND s.data::text ILIKE ${`%${q.replace(/[\\%_]/g, "\\$&")}%`}` : null;
  const where: Prisma.SubmissionWhereInput = { form: { organizationId: organization.id }, ...(formId ? { formId } : {}), ...(status ? { status: status as typeof LEAD_STATUSES[number] } : {}), ...(matched ? { id: { in: matched.map(row => row.id) } } : {}), ...(view === "unread" ? { readAt: null } : view === "mine" ? { assigneeId: user.id } : view === "unassigned" ? { assigneeId: null } : view === "overdue" ? { AND: [{ followUpAt: { lte: new Date() }, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } }] } : {}) };
  const [total, forms, views, members] = await Promise.all([
    db.submission.count({ where }),
    db.form.findMany({ where: { organizationId: organization.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.savedInboxView.findMany({ where: { organizationId: organization.id, userId: user.id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    canWrite ? db.organizationMember.findMany({ where: { organizationId: organization.id, role: { in: ["OWNER", "ADMIN", "MEMBER"] } }, select: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } }) : [],
  ]);
  const pages = Math.max(1, Math.ceil(total / 25)); const page = Math.min(requestedPage, pages);
  const include = { form: { select: { name: true } }, assignee: { select: { name: true } } };
  const orderBy: Prisma.SubmissionOrderByWithRelationInput[] = sort === "followup" ? [{ followUpAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }, { id: "asc" }] : [{ createdAt: sort === "oldest" ? "asc" : "desc" }, { id: sort === "oldest" ? "asc" : "desc" }];
  const serialize = (submission: Prisma.SubmissionGetPayload<{ include: typeof include }>): InboxLead => ({ id: submission.id, updatedAt: submission.updatedAt.toISOString(), status: submission.status, read: Boolean(submission.readAt), formName: submission.form.name, assigneeName: submission.assignee?.name ?? null, followUpAt: submission.followUpAt?.toISOString() ?? null, createdAt: submission.createdAt.toISOString(), preview: Object.entries(submission.data as Record<string, unknown>).slice(0, 3).map(([key, value]) => [key, renderValue(value)]) });
  const submissions = layout === "list" ? (await db.submission.findMany({ where, include, orderBy, take: 25, skip: (page - 1) * 25 })).map(serialize) : [];
  const stages = layout === "board" ? await Promise.all(LEAD_STATUSES.filter(value => !status || status === value).map(async value => {
    const stageWhere: Prisma.SubmissionWhereInput = { AND: [where, { status: value }] };
    const [count, rows] = await Promise.all([db.submission.count({ where: stageWhere }), db.submission.findMany({ where: stageWhere, include, orderBy, take: 25 })]);
    return { status: value, count, leads: rows.map(serialize) };
  })) : [];
  return <div className="page">
    {/* Document navigation keeps layout changes independent of pending router transitions. */}
    <PageHeader eyebrow="Unified inbox" title="Inbox" description={`${total.toLocaleString()} enquiries`} action={<div className="header-actions"><Link className="button button-secondary" href={`/follow-ups${formId ? `?form=${encodeURIComponent(formId)}` : ""}`}><CalendarDays size={16} />Follow-ups</Link><div className="segmented inbox-layout" aria-label="Inbox layout"><a href={inboxLink(filters, { layout: "list" })} aria-current={layout === "list" ? "page" : undefined} title="List view"><List size={16} />List</a><a href={inboxLink(filters, { layout: "board" })} aria-current={layout === "board" ? "page" : undefined} title="Pipeline view"><Columns3 size={16} />Pipeline</a></div></div>} />
    <InboxViews key={`views:${JSON.stringify(filters)}`} filters={filters} views={views.map(saved => ({ id: saved.id, name: saved.name, filters: inboxFilters(saved.filters) }))} />
    <form key={`filters:${JSON.stringify(filters)}`} className="inbox-filter-form" method="get">
      <input type="hidden" name="layout" value={layout} />
      <div className="inbox-query"><label className="field"><span className="sr-only">Search</span><input name="q" defaultValue={q} placeholder="Search name, email, or message" maxLength={200} /></label><button className="button button-secondary" type="submit"><Search size={16} />Search</button></div>
      <details className="inbox-filter-disclosure" open={Boolean(status || formId || view || sort !== "newest")}><summary><SlidersHorizontal size={16} />Filters{(status || formId || view || sort !== "newest") && <span className="filter-active-dot" />}</summary>
        <div className="inbox-advanced-filters"><label className="field"><span>Status</span><select name="status" defaultValue={status}><option value="">All statuses</option>{LEAD_STATUSES.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><label className="field"><span>Form</span><select name="form" defaultValue={formId}><option value="">All forms</option>{forms.map(form => <option key={form.id} value={form.id}>{form.name}</option>)}</select></label><label className="field"><span>View</span><select name="view" defaultValue={view}><option value="">All enquiries</option><option value="unread">Unread</option><option value="mine">Assigned to me</option><option value="unassigned">Unassigned</option><option value="overdue">Follow-up due</option></select></label><label className="field"><span>Sort</span><select name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="followup">Follow-up date</option></select></label><button className="button button-secondary" type="submit">Apply</button><a className="text-link" href={inboxLink(inboxFilters({ layout }))}>Reset</a></div>
      </details>
    </form>
    {layout === "list" ? <><section className="panel panel-flush">{submissions.length ? <InboxResults key={inboxLink(filters, { page: String(page) })} leads={submissions} members={members.map(member => member.user)} canWrite={canWrite} /> : <EmptyState title={q || status || formId || view ? "No matching enquiries" : "Your inbox is quiet"} description="Enquiries from your website appear here." />}</section><nav className="pagination" aria-label="Inbox pages">{page > 1 ? <a className="icon-button" href={inboxLink(filters, { page: String(page - 1) })} aria-label="Previous page" title="Previous page"><ChevronLeft size={18} /></a> : <span />}<span>Page {page} of {pages}</span>{page < pages ? <a className="icon-button" href={inboxLink(filters, { page: String(page + 1) })} aria-label="Next page" title="Next page"><ChevronRight size={18} /></a> : <span />}</nav></> : <div className="pipeline-board" aria-label="Enquiry pipeline">{stages.map(stage => <section className="pipeline-stage" key={stage.status} aria-label={`${statusLabel(stage.status)} enquiries`}><header><h2 className="lead-status" data-status={stage.status}>{statusLabel(stage.status)}</h2><span>{stage.count.toLocaleString()}</span></header><div className="pipeline-leads">{stage.leads.map(lead => <article className="pipeline-lead" key={lead.id}><Link href={`/submissions/${lead.id}`}><strong>{lead.preview[0]?.[1] || lead.formName}</strong><span>{lead.formName}</span></Link><p>{lead.preview[1]?.[1]}</p><small>{lead.assigneeName ?? "Unassigned"}</small>{lead.followUpAt && <small>Follow up {lead.followUpAt.slice(0, 10)}</small>}<time dateTime={lead.createdAt}>{lead.createdAt.slice(0, 10)}</time>{canWrite && <PipelineMove key={lead.updatedAt} lead={lead} />}</article>)}{!stage.count && <p className="pipeline-empty">No enquiries</p>}</div>{stage.count > 25 && <a className="text-link" href={inboxLink(filters, { layout: "list", status: stage.status })}>View all {stage.count.toLocaleString()}<ChevronRight size={15} /></a>}</section>)}</div>}
  </div>;
}
