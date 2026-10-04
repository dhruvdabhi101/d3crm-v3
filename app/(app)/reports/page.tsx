import { ArrowUpRight, Filter } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";
import { contactDuration, leadReport, reportRange } from "@/lib/reports";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { organization } = await getCurrentContext();
  const params = await searchParams;
  const get = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  let range; let error;
  try { range = reportRange(get("from"), get("to")); } catch (value) { error = value instanceof Error ? value.message : "Invalid date range."; }
  const forms = await db.form.findMany({ where: { organizationId: organization.id }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const formId = get("form");
  if (formId && !forms.some(form => form.id === formId)) error = "Choose a form in this workspace.";
  const report = range && !error ? await leadReport(organization.id, range, formId) : null;
  const total = report ? report.totals.total - report.totals.spam : 0;
  const conversion = total ? `${(report!.totals.won * 100 / total).toFixed(1)}%` : "0%";
  return <div className="page reports-page"><PageHeader title="Reports" description={organization.name} />
    <form className="report-filters" method="get"><label className="field"><span>From · UTC</span><input name="from" type="date" defaultValue={get("from") || range?.from} required /></label><label className="field"><span>To · UTC</span><input name="to" type="date" defaultValue={get("to") || range?.to} required /></label><label className="field"><span>Form</span><select name="form" defaultValue={formId}><option value="">All forms</option>{forms.map(form => <option key={form.id} value={form.id}>{form.name}</option>)}</select></label><button className="button button-secondary" type="submit"><Filter size={15} />Apply</button></form>
    {error && <p role="alert" className="form-error">{error}</p>}
    {report && <>
      <section className="report-metrics" aria-label="Lead metrics">{[["Enquiries · excluding spam", total.toLocaleString()], ["Won", report.totals.won.toLocaleString()], ["Lead-to-won", conversion], ["Avg. first marked contacted", contactDuration(report.totals.contactSeconds)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</section>
      <div className="report-summary"><span>Qualified <strong>{report.totals.qualified}</strong></span><span>Lost <strong>{report.totals.lost}</strong></span><span>Overdue <strong>{report.totals.overdue}</strong></span><span>Spam <strong>{report.totals.spam}</strong></span><span>Contact-time sample <strong>{report.totals.contacted}</strong></span></div>
      <section className="report-section"><h2>Enquiries by day</h2>{report.daily.length ? <div className="report-days" role="img" aria-label="Daily non-spam enquiry counts">{report.daily.map(day => <div key={day.day} title={`${day.day}: ${day.total} enquiries`}><div className="report-bar-track"><i style={{ height: `${Math.max(3, day.total / Math.max(...report.daily.map(value => value.total)) * 100)}%` }} /></div><span>{day.day.slice(5)}</span><strong>{day.total}</strong></div>)}</div> : <p className="quiet-note">No enquiries in this period.</p>}</section>
      <div className="report-breakdowns"><section className="report-section"><h2>By form</h2><div className="wide-table"><table><thead><tr><th>Form</th><th>Enquiries</th><th>Won</th><th>Lead-to-won</th></tr></thead><tbody>{report.forms.map(form => <tr key={form.id}><td><Link className="text-link" href={`/submissions?form=${form.id}`}>{form.name}<ArrowUpRight size={13} /></Link></td><td>{form.total}</td><td>{form.won}</td><td>{(form.won * 100 / form.total).toFixed(1)}%</td></tr>)}</tbody></table></div>{!report.forms.length && <p className="quiet-note">No enquiries in this period.</p>}</section>
      <section className="report-section"><h2>By reported source</h2><div className="wide-table"><table><thead><tr><th>Source</th><th>Enquiries</th><th>Won</th></tr></thead><tbody>{report.sources.map(source => <tr key={source.source}><td>{source.source}</td><td>{source.total}</td><td>{source.won}</td></tr>)}</tbody></table></div>{!report.sources.length && <p className="quiet-note">No sources in this period.</p>}</section></div>
    </>}
  </div>;
}
