
import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { publicMetadata } from "@/lib/site/seo";

export const metadata = publicMetadata("Website enquiry CRM for teams and agencies", "Connect website forms, assign enquiries, manage a shared pipeline, and schedule lead follow-ups in separate client workspaces with d3CRM.", "/features");

const features = [
  ["Website contact forms", "Create a form or connect an existing one with generated HTML and JavaScript."],
  ["Shared enquiry inbox", "Search and filter enquiries. Keep notes, saved views, and contact history together."],
  ["Enquiry pipeline", "Track status in a list or pipeline, and update several enquiries at once."],
  ["Follow-up agenda", "See overdue, today, and upcoming follow-ups in UTC. Closed enquiries leave the agenda."],
  ["Reply templates", "Reuse saved replies. Review and send drafts from your own email app."],
  ["Client workspaces and lead routing", "Separate each client's forms and access. Assign enquiries manually or by round robin."],
  ["Campaign reports and CSV export", "Compare sources, status, and reply times. Export enquiry details to CSV."],
  ["Controlled access", "Set team roles, restrict website origins, rotate keys, and review activity."],
];

export default function FeaturesPage() {
  return <><h1>Manage website enquiries</h1><p className="resource-intro">Collect enquiries from your website. Assign, reply, and follow up with your team.</p><div className="hero-actions"><Button asChild variant="default"><Link className="button button-primary" href="/demo">Try the interactive demo</Link></Button><Button asChild variant="outline"><Link className="button button-secondary" href="/guides/connect-website-forms">Read the setup guide</Link></Button></div><div className="resource-grid">{features.map(([title, text]) => <Card className="resource-card" key={title}><h2>{title}</h2><p>{text}</p></Card>)}</div><section className="resource-section"><h2>Does d3CRM fit your workflow?</h2><p>Use it when you already have a website and need a shared process for the enquiries it generates. Your site needs custom JavaScript support for the generated integration snippet. The pipeline tracks enquiries; it does not forecast deal revenue. Reply drafts open in your own email app. Optional email alerts, webhooks, and billing depend on the deployment&apos;s configuration.</p><p><Link href="/guides/manage-client-enquiries">See the agency workflow</Link> or <Link href="/guides/follow-up-website-leads">build a daily follow-up routine</Link>.</p></section></>;
}
