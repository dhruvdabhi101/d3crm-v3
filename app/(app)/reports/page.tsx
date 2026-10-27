import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ArrivalHeatmap, PipelineBar, RankedBars, ResponseCohorts, TrendChart } from "@/components/report-charts";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";
import { busiestSlot, contactDuration, fillDays, leadReport, percentChange, reportRange, reportTrends } from "@/lib/reports";

const presets = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
] as const;

function Change({ current, previous, days }: { current: number; previous: number; days: number }) {
  const change = percentChange(current, previous);
  if (change === null) return <span className="kpi-change">No earlier data to compare</span>;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  return (
    <span className="kpi-change" data-direction={direction}>
      {direction === "flat" ? "Same as" : `${direction === "up" ? "Up" : "Down"} ${Math.abs(change)}% on`} the previous {days} days
    </span>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { organization } = await getCurrentContext();
  const params = await searchParams;
  const get = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  let range; let error;
  try { range = reportRange(get("from"), get("to")); } catch (value) { error = value instanceof Error ? value.message : "Invalid date range."; }
  const forms = await db.form.findMany({ where: { organizationId: organization.id }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const formId = get("form");
  if (formId && !forms.some(form => form.id === formId)) error = "Choose a form in this workspace.";
  const [report, trends] = range && !error
    ? await Promise.all([leadReport(organization.id, range, formId), reportTrends(organization.id, range, formId)])
    : [null, null];

  const today = new Date().toISOString().slice(0, 10);
  const spanDays = range ? Math.round((range.end.getTime() - range.start.getTime()) / 86400_000) : 30;
  const presetHref = (days: number) => {
    const query = new URLSearchParams({ from: new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86400_000).toISOString().slice(0, 10), to: today });
    if (formId) query.set("form", formId);
    return `/reports?${query}`;
  };
  const activePreset = range?.to === today ? presets.find(preset => preset.days === spanDays)?.days : undefined;
  const total = report ? report.totals.total - report.totals.spam : 0;
  const busiest = trends ? busiestSlot(trends.arrivals) : null;

  return (
    <div className="page reports-page">
      <PageHeader
        title="Reports"
        description="How many enquiries you get, where they come from, and how quickly you reply. All dates and times are in UTC."
      />

      <section className="report-toolbar" aria-label="Report period">
        <nav className="report-presets" aria-label="Quick periods">
          {presets.map(preset => (
            <Link
              key={preset.days}
              href={presetHref(preset.days)}
              aria-current={activePreset === preset.days ? "page" : undefined}
            >
              {preset.label}
            </Link>
          ))}
        </nav>
        <form className="report-filters" method="get">
          <Label className="field">
            <span>From</span>
            <Input name="from" type="date" defaultValue={get("from") || range?.from} required />
          </Label>
          <Label className="field">
            <span>To</span>
            <Input name="to" type="date" defaultValue={get("to") || range?.to} required />
          </Label>
          <Label className="field">
            <span>Form</span>
            <NativeSelect name="form" defaultValue={formId}>
              <NativeSelectOption value="">All forms</NativeSelectOption>
              {forms.map(form => <NativeSelectOption key={form.id} value={form.id}>{form.name}</NativeSelectOption>)}
            </NativeSelect>
          </Label>
          <Button variant="outline" className="button button-secondary" type="submit">Update</Button>
        </form>
      </section>

      {error && <Alert variant="destructive" role="alert" className="form-error"><AlertDescription>{error}</AlertDescription></Alert>}

      {report && trends && range && (total === 0 && trends.previous.total === 0 ? (
        <EmptyState
          title="No enquiries in this period"
          description="Once your website forms start receiving enquiries, this page shows how many arrive, where they come from, and how quickly you reply."
          action={<Button asChild variant="outline"><Link className="button button-secondary" href="/forms">Go to forms</Link></Button>}
        />
      ) : <>
        <section className="report-kpis" aria-label="Headline numbers">
          <article className="kpi-card">
            <h2>Enquiries</h2>
            <strong>{total.toLocaleString()}</strong>
            <Change current={total} previous={trends.previous.total} days={spanDays} />
          </article>
          <article className="kpi-card">
            <h2>Won</h2>
            <strong>{report.totals.won.toLocaleString()}</strong>
            <Change current={report.totals.won} previous={trends.previous.won} days={spanDays} />
          </article>
          <article className="kpi-card">
            <h2>Enquiry to won</h2>
            <strong>{total ? `${(report.totals.won * 100 / total).toFixed(1)}%` : "–"}</strong>
            <span className="kpi-change">Of enquiries in this period, spam excluded</span>
          </article>
          <article className="kpi-card">
            <h2>Time to first contact</h2>
            <strong>{contactDuration(report.totals.contactSeconds)}</strong>
            <span className="kpi-change">Average across {report.totals.contacted} contacted {report.totals.contacted === 1 ? "enquiry" : "enquiries"}</span>
          </article>
        </section>

        <section className="report-card">
          <header className="report-card-head">
            <h2>Enquiries by day</h2>
            <p>{dayRange(range.from, range.to)}{report.totals.spam ? ` · ${report.totals.spam} spam not counted` : ""}</p>
          </header>
          <TrendChart days={fillDays(range, report.daily)} today={today} />
        </section>

        <div className="report-pair">
          <section className="report-card">
            <header className="report-card-head">
              <h2>Where they stand now</h2>
              <p>Current status of this period&apos;s enquiries.</p>
            </header>
            <PipelineBar counts={{ new: report.totals.new, inContact: report.totals.inContact, qualified: report.totals.qualified, won: report.totals.won, lost: report.totals.lost }} />
            {report.totals.overdue > 0 && (
              <Link className="report-callout" href="/follow-ups">
                <span><strong>{report.totals.overdue}</strong> {report.totals.overdue === 1 ? "follow-up is" : "follow-ups are"} overdue</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            )}
          </section>
          <section className="report-card">
            <header className="report-card-head">
              <h2>When enquiries arrive</h2>
              <p>{busiest ? <>Busiest: <strong>{busiest}</strong>. Be ready to reply then.</> : "No enquiries yet."}</p>
            </header>
            <ArrivalHeatmap grid={trends.arrivals} />
          </section>
        </div>

        <section className="report-card">
          <header className="report-card-head">
            <h2>How quickly you reply</h2>
            <p>Each row is a week of enquiries. The cells show how many you first contacted within an hour, within a day, at all, and how many you won. Darker means more.</p>
          </header>
          {trends.cohorts.length
            ? <ResponseCohorts cohorts={trends.cohorts} />
            : <p className="report-empty">No enquiries in this period.</p>}
        </section>

        <div className="report-pair">
          <section className="report-card">
            <header className="report-card-head">
              <h2>By form</h2>
              <p>Open a form to see its enquiries.</p>
            </header>
            <RankedBars
              empty="No enquiries in this period."
              rows={report.forms.map(form => ({
                key: form.id,
                total: form.total,
                won: form.won,
                label: <Link className="text-link" href={`/submissions?form=${form.id}`}>{form.name}</Link>,
              }))}
            />
          </section>
          <section className="report-card">
            <header className="report-card-head">
              <h2>By source</h2>
              <p>From campaign links (utm_source), or the website the form is on.</p>
            </header>
            <RankedBars
              empty="No sources in this period."
              rows={report.sources.map(source => ({ key: source.source, total: source.total, won: source.won, label: source.source === "Unknown" ? "Not tagged" : source.source }))}
            />
          </section>
        </div>
      </>)}
    </div>
  );
}

function dayRange(from: string, to: string) {
  const format = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return `${format(from)} – ${format(to)}`;
}
