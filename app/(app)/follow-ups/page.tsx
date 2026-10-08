
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FollowUpControls, FollowUpFeedback } from "@/components/follow-up-controls";
import { PageHeader } from "@/components/page-header";
import { followUpAgenda } from "@/lib/follow-ups";
import { FOLLOW_UP_PERIODS, followUpFilters, followUpLink, type FollowUpPeriod } from "@/lib/follow-up-filters";
import { pageNumber, statusLabel } from "@/lib/leads";
import { getCurrentContext } from "@/lib/permissions";

const periodLabels: Record<FollowUpPeriod, string> = { overdue: "Overdue", today: "Today", upcoming: "Next 7 days", all: "All scheduled" };
const dateLabel = (date: string) => new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`));

function contactName(data: unknown, email: string | null) {
  const answers = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const name = [answers.name, answers.full_name, answers.first_name].find(value => typeof value === "string" && value.trim());
  if (typeof name === "string") return name.trim().slice(0, 200);
  return email || Object.values(answers).find(value => typeof value === "string" && value.trim())?.toString().trim().slice(0, 200) || "Enquiry";
}

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { organization, user, membership } = await getCurrentContext();
  const params = await searchParams;
  const filters = followUpFilters(params);
  const now = new Date();
  const agenda = await followUpAgenda(organization.id, user.id, filters, pageNumber(typeof params.page === "string" ? params.page : undefined), now);
  const canWrite = membership.role !== "VIEWER";
  const unavailableForm = Boolean(filters.form && !agenda.forms.some(form => form.id === filters.form));
  const days = new Map<string, typeof agenda.rows>();
  for (const row of agenda.rows) {
    if (!row.followUpAt) continue;
    const date = row.followUpAt.toISOString().slice(0, 10);
    if (!days.has(date)) days.set(date, []);
    days.get(date)!.push(row);
  }
  return <div className="page follow-up-page">
    <PageHeader eyebrow={organization.name} title="Follow-ups" description={`${agenda.total.toLocaleString()} ${agenda.total === 1 ? "enquiry" : "enquiries"} scheduled`} action={<Button asChild variant="outline"><Link className="button button-secondary" href="/submissions"><Inbox size={16} aria-hidden />Inbox</Link></Button>} />
    <nav className="segmented follow-up-periods" aria-label="Follow-up period">{FOLLOW_UP_PERIODS.map(period => <Link key={period} href={followUpLink(filters, { period })} aria-current={filters.period === period ? "page" : undefined}>{periodLabels[period]}<span>{agenda.counts[period].toLocaleString()}</span></Link>)}</nav>
    <form key={JSON.stringify(filters)} className="follow-up-filters" method="get">
      <input name="period" type="hidden" value={filters.period} />
      <Label className="field"><span>Assigned to</span><NativeSelect aria-label="Assigned to" name="assignee" defaultValue={filters.assignee}><NativeSelectOption value="all">Everyone</NativeSelectOption><NativeSelectOption value="mine">Me</NativeSelectOption><NativeSelectOption value="unassigned">Unassigned</NativeSelectOption></NativeSelect></Label>
      <Label className="field"><span>Form</span><NativeSelect aria-label="Form" name="form" defaultValue={filters.form}><NativeSelectOption value="">All forms</NativeSelectOption>{unavailableForm && <NativeSelectOption value={filters.form}>Unavailable form</NativeSelectOption>}{agenda.forms.map(form => <NativeSelectOption key={form.id} value={form.id}>{form.name}</NativeSelectOption>)}</NativeSelect></Label>
      <Button variant="outline" className="button button-secondary" type="submit"><Filter size={16} aria-hidden />Filter</Button>
      {(filters.assignee !== "all" || filters.form) && <Link className="text-link" href={followUpLink({ ...filters, assignee: "all", form: "" })}>Clear filters</Link>}
    </form>
    <p className="follow-up-summary">{periodLabels[filters.period]}<span aria-hidden> / </span>UTC{filters.period === "upcoming" ? <><span aria-hidden> / </span>{dateLabel(new Date(now.getTime() + 86400_000).toISOString().slice(0, 10))} - {dateLabel(new Date(now.getTime() + 7 * 86400_000).toISOString().slice(0, 10))}</> : null}</p>
    {unavailableForm && <Alert variant="destructive" className="form-error" role="status"><AlertDescription>This form is not available in this workspace.</AlertDescription></Alert>}
    <FollowUpFeedback>{agenda.rows.length ? <div className="follow-up-groups">{Array.from(days, ([date, rows]) => <section className="follow-up-day" key={date} aria-label={dateLabel(date)}>
      <header><h2><CalendarDays size={16} aria-hidden /><time dateTime={date}>{dateLabel(date)}</time></h2><span>{rows.length} on this page</span></header>
      {rows.map(row => <article className="follow-up-row" key={row.id}>
        <div className="follow-up-contact"><Link href={`/submissions/${row.id}`}><strong>{contactName(row.data, row.contactEmail)}</strong></Link>{row.contactEmail && <span>{row.contactEmail}</span>}<Link className="text-link" href={`/forms/${row.form.id}`}>{row.form.name}</Link></div>
        <div className="follow-up-meta"><Badge variant="secondary" className="lead-status" data-status={row.status}>{statusLabel(row.status)}</Badge><span>{row.assignee?.name ?? "Unassigned"}</span></div>
        {canWrite && <FollowUpControls key={row.id} id={row.id} date={date} updatedAt={row.updatedAt.toISOString()} />}
      </article>)}
    </section>)}</div> : <EmptyState title={filters.assignee !== "all" || filters.form ? "No matching follow-ups" : filters.period === "overdue" ? "Nothing overdue" : filters.period === "today" ? "No follow-ups today" : "No scheduled follow-ups"} description="No open enquiries are scheduled in this period." action={<Button asChild variant="outline"><Link className="button button-secondary" href="/submissions"><Inbox size={16} aria-hidden />Open inbox</Link></Button>} />}</FollowUpFeedback>
    <nav className="pagination" aria-label="Follow-up pages">{agenda.page > 1 ? <Link className="icon-button" href={followUpLink(filters, { page: String(agenda.page - 1) })} aria-label="Previous page" title="Previous page"><ChevronLeft size={18} aria-hidden /></Link> : <span />}<span>Page {agenda.page} of {agenda.pages}</span>{agenda.page < agenda.pages ? <Link className="icon-button" href={followUpLink(filters, { page: String(agenda.page + 1) })} aria-label="Next page" title="Next page"><ChevronRight size={18} aria-hidden /></Link> : <span />}</nav>
  </div>;
}
