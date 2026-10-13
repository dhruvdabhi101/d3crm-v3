
import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowUpRight, CalendarDays, Clock, Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";
import { ACTIVE_FOLLOW_UP_STATUSES, followUpRange } from "@/lib/follow-up-filters";
import { WeeklyActivity } from "@/components/weekly-activity";
import { weeklyDays } from "@/lib/weekly-activity";
import { leadReport, reportRange } from "@/lib/reports";

function preview(data: unknown) {
  const values = Object.values((data ?? {}) as Record<string, unknown>).filter((value) => typeof value === "string" && value);
  return values.slice(0, 2).join(" · ") || "Submission received";
}

export default async function DashboardPage() {
  const { organization, membership } = await getCurrentContext();
  const canAdmin = ["OWNER", "ADMIN"].includes(membership.role);
  const [forms, liveForms, submissions, recent] = await Promise.all([
    db.form.count({ where: { organizationId: organization.id } }),
    db.form.count({ where: { organizationId: organization.id, status: "LIVE" } }),
    db.submission.count({ where: { form: { organizationId: organization.id } } }),
    db.submission.findMany({ where: { form: { organizationId: organization.id } }, include: { form: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const now = new Date();
  const days = weeklyDays([], now);
  const report = await leadReport(organization.id, reportRange(days[0].day, days[6].day, now));
  const scheduled = { form: { organizationId: organization.id }, status: { in: [...ACTIVE_FOLLOW_UP_STATUSES] } };
  const [unread, overdue, today, followUps] = await Promise.all([
    db.submission.count({ where: { form: { organizationId: organization.id }, readAt: null } }),
    db.submission.count({ where: { ...scheduled, followUpAt: followUpRange("overdue", now) } }),
    db.submission.count({ where: { ...scheduled, followUpAt: followUpRange("today", now) } }),
    db.submission.findMany({ where: { ...scheduled, followUpAt: { not: null } }, select: { id: true, data: true, followUpAt: true, form: { select: { name: true } } }, orderBy: [{ followUpAt: "asc" }, { id: "asc" }], take: 5 }),
  ]);
  return <div className="page overview-page">
    <PageHeader eyebrow={organization.name} title="Overview" description="Your next steps, before the numbers. Follow-up dates use UTC." action={canAdmin ? <Button asChild variant="outline"><Link className="button button-secondary" href="/forms/new"><Plus size={16} />Create form</Link></Button> : undefined} />
    <section className="stats-grid daily-priorities" aria-label="Your priorities">
      <Link className="stat-card" data-attention={overdue > 0} href="/follow-ups?period=overdue"><p><Clock size={16} />Overdue <ArrowUpRight size={14} /></p><strong>{overdue.toLocaleString()}</strong><small>{overdue ? "Pick up where you left off" : "No overdue follow-ups"}</small></Link>
      <Link className="stat-card" href="/follow-ups?period=today"><p><CalendarDays size={16} />Due today <ArrowUpRight size={14} /></p><strong>{today.toLocaleString()}</strong><small>{today ? "Keep the conversation moving" : "Nothing scheduled today"}</small></Link>
      <Link className="stat-card" href="/submissions?view=unread"><p><Inbox size={16} />Unread enquiries <ArrowUpRight size={14} /></p><strong>{unread.toLocaleString()}</strong><small>{unread ? "Open your inbox to catch up" : "You're all caught up"}</small></Link>
    </section>
    <div className="overview-grid">
      <Card className="inbox-panel"><div className="panel-header"><div><h2>Latest enquiries</h2></div><Link className="text-link" href="/submissions">View inbox <ArrowUpRight size={14} /></Link></div>
        {recent.length ? <div className="list">{recent.map(submission => <Link className="list-row" href={`/submissions/${submission.id}`} key={submission.id}><span className="submission-dot" aria-hidden /><span className="list-main"><strong>{preview(submission.data)}</strong><small>{submission.form.name}</small></span><time>{submission.createdAt.toLocaleDateString("en", { month: "short", day: "numeric" })}</time><ArrowRight className="row-arrow" size={15} /></Link>)}</div> : <EmptyState title="Ready for your first hello." description="When someone fills out your form, their response will appear here." action={canAdmin ? <Link className="text-link" href={forms ? "/forms" : "/forms/new"}>{forms ? "Connect a form" : "Create your first form"} <ArrowRight size={14} /></Link> : undefined} />}
      </Card>
      <aside className="overview-followups"><header><h2>Next follow-ups</h2><Link className="text-link" href="/follow-ups?period=all" title="All follow-ups" aria-label="All follow-ups"><ArrowUpRight size={17} /></Link></header>{followUps.length ? <ol>{followUps.map(lead => {
        const dueDay = lead.followUpAt!.toISOString().slice(0, 10);
        const todayDay = now.toISOString().slice(0, 10);
        return <li key={lead.id}><Link href={`/submissions/${lead.id}`}><strong>{preview(lead.data)}</strong><span>{lead.form.name}</span></Link><time dateTime={lead.followUpAt!.toISOString()} data-overdue={dueDay < todayDay}>{dueDay < todayDay ? "Overdue" : dueDay === todayDay ? "Today" : "Upcoming"}<span>{lead.followUpAt!.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" })}</span></time></li>;
      })}</ol> : <p className="quiet-note">No scheduled follow-ups. Open an enquiry to set its next step.</p>}</aside>
    </div>
    <div className="overview-metrics"><Link href="/submissions"><strong>{submissions.toLocaleString()}</strong> total enquiries <ArrowUpRight size={14} /></Link><Link href="/forms"><span className="live-dot" /><strong>{liveForms.toLocaleString()}</strong> live forms <span>of {forms.toLocaleString()}</span><ArrowUpRight size={14} /></Link></div>
    <WeeklyActivity days={weeklyDays(report.daily, now)} total={report.totals.total - report.totals.spam} won={report.totals.won} />
  </div>;
}
