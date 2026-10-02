import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { LEAD_STATUSES, pageNumber, statusLabel } from "@/lib/leads";

function renderValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "—");
}

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; form?: string; view?: string; page?: string }> }) {
  const { organization, user } = await getCurrentContext();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 200); const requestedPage = pageNumber(params.page);
  const status = LEAD_STATUSES.includes(params.status as typeof LEAD_STATUSES[number]) ? params.status as typeof LEAD_STATUSES[number] : undefined;
  const formId = (params.form ?? "").slice(0, 100);
  const view = ["unread", "mine", "overdue"].includes(params.view ?? "") ? params.view : "";
  const matched = q ? await db.$queryRaw<{ id: string }[]>`SELECT s.id FROM "Submission" s JOIN "Form" f ON f.id = s."formId" WHERE f."organizationId" = ${organization.id} AND s.data::text ILIKE ${`%${q.replace(/[\\%_]/g, "\\$&")}%`}` : null;
  const where: Prisma.SubmissionWhereInput = { form: { organizationId: organization.id }, ...(formId ? { formId } : {}), ...(status ? { status } : {}), ...(matched ? { id: { in: matched.map(row => row.id) } } : {}), ...(view === "unread" ? { readAt: null } : view === "mine" ? { assigneeId: user.id } : view === "overdue" ? { followUpAt: { lt: new Date() }, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } } : {}) };
  const [total, forms] = await Promise.all([db.submission.count({ where }), db.form.findMany({ where: { organizationId: organization.id }, select: { id: true, name: true } })]);
  const pages = Math.max(1, Math.ceil(total / 25)); const page = Math.min(requestedPage, pages);
  const submissions = await db.submission.findMany({ where, include: { form: { select: { name: true } }, assignee: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 25, skip: (page - 1) * 25 });
  const pageLink = (number: number) => { const query = new URLSearchParams({ q, status: status ?? "", form: formId, view: view ?? "", page: String(number) }); return `/submissions?${query}`; };
  return (
    <div className="page">
      <PageHeader eyebrow="Unified inbox" title="Submissions" description={`${total.toLocaleString()} enquiries`} />
      <form className="inbox-filters" method="get"><label className="field"><span>Search</span><input name="q" defaultValue={q} placeholder="Name, email, or message" maxLength={200} /></label><label className="field"><span>Status</span><select name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{LEAD_STATUSES.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><label className="field"><span>Form</span><select name="form" defaultValue={formId}><option value="">All forms</option>{forms.map(form => <option key={form.id} value={form.id}>{form.name}</option>)}</select></label><label className="field"><span>View</span><select name="view" defaultValue={view}><option value="">All enquiries</option><option value="unread">Unread</option><option value="mine">Assigned to me</option><option value="overdue">Follow-up due</option></select></label><button className="button button-secondary" type="submit"><Search size={16} />Search</button></form>
      <section className="panel panel-flush">
        {submissions.length ? <div className="submission-table" role="table">
          <div className="table-head" role="row"><span>Form / Status</span><span>Response</span><span>Received</span></div>
          {submissions.map((submission) => {
            const entries = Object.entries(submission.data as Record<string, unknown>);
            return <Link className={`table-row enquiry-row ${submission.readAt ? "" : "enquiry-unread"}`} href={`/submissions/${submission.id}`} key={submission.id}><span><strong>{submission.form.name}</strong><small className="lead-status" data-status={submission.status}>{statusLabel(submission.status)}{submission.assignee && ` · ${submission.assignee.name}`}</small></span><span className="response-preview">{entries.slice(0, 3).map(([key, value]) => <span key={key}><small>{key.replaceAll("_", " ")}</small><span className="response-text">{renderValue(value)}</span></span>)}</span><time>{submission.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</time></Link>;
          })}
        </div> : <EmptyState title={q || status || formId || view ? "No matching enquiries" : "Your inbox is quiet"} description="Enquiries from your website appear here." />}
      </section>
      <nav className="pagination" aria-label="Inbox pages">{page > 1 ? <Link className="icon-button" href={pageLink(page - 1)} aria-label="Previous page" title="Previous page"><ChevronLeft size={18} /></Link> : <span />}<span>Page {page} of {pages}</span>{page < pages ? <Link className="icon-button" href={pageLink(page + 1)} aria-label="Next page" title="Next page"><ChevronRight size={18} /></Link> : <span />}</nav>
    </div>
  );
}
