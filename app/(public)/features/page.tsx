
import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { publicMetadata } from "@/lib/site/seo";

export const metadata = publicMetadata("Website enquiry CRM for teams and agencies", "Connect website forms, assign enquiries, manage a shared pipeline, and schedule lead follow-ups in separate client workspaces with d3CRM.", "/features");

const features = [
  ["Website contact forms", "Build a form, start from a template, or connect your existing website with generated HTML and JavaScript. Match field IDs, set allowed origins, and test the endpoint before going live."],
  ["Shared enquiry inbox", "Search, filter, assign, and qualify enquiries. Use unread flags, private saved views, notes, and same-email history to keep the context together."],
  ["Enquiry pipeline", "Move enquiries through New, Contacted, Qualified, Won, Lost, and Spam. Switch between the list and pipeline with the same filters, or update selected enquiries in a batch."],
  ["Follow-up agenda", "Schedule the next action and review overdue, today, and upcoming enquiries. Follow-up dates use UTC; closed and spam enquiries stay out of the active agenda."],
  ["Reply templates", "Prepare personalised email drafts using workspace templates. Copy a draft or open your email app, then review and send it yourself."],
  ["Client workspaces and lead routing", "Keep each client's forms, enquiries, and permissions separate. Assign new enquiries manually, to a default teammate, or by round robin across eligible writers."],
  ["Campaign reports and CSV export", "Review enquiry creation-date cohorts by form, reported source, and current status. Export answers and submitted campaign context to an Excel-compatible CSV."],
  ["Controlled access", "Use owner, admin, member, and viewer roles. Form keys can be rotated, website origins restricted, and workspace changes reviewed in the activity history."],
];

export default function FeaturesPage() {
  return <><p className="eyebrow">THE PRODUCT</p><h1>A website enquiry CRM with a clear next step.</h1><p className="resource-intro">d3CRM connects website contact forms to a shared inbox for small teams and agencies. Keep each enquiry&apos;s answers, owner, status, and follow-up date together.</p><div className="hero-actions"><Button asChild variant="default"><Link className="button button-primary" href="/demo">Try the interactive demo</Link></Button><Button asChild variant="outline"><Link className="button button-secondary" href="/guides/connect-website-forms">Read the setup guide</Link></Button></div><div className="resource-grid">{features.map(([title, text]) => <Card className="resource-card" key={title}><h2>{title}</h2><p>{text}</p></Card>)}</div><section className="resource-section"><h2>Does d3CRM fit your workflow?</h2><p>Use it when you already have a website and need a shared process for the enquiries it generates. Your site needs custom JavaScript support for the generated integration snippet. The pipeline tracks enquiries; it does not forecast deal revenue. Reply drafts open in your own email app. Optional email alerts, webhooks, and billing depend on the deployment&apos;s configuration.</p><p><Link href="/guides/manage-client-enquiries">See the agency workflow</Link> or <Link href="/guides/follow-up-website-leads">build a daily follow-up routine</Link>.</p></section></>;
}
