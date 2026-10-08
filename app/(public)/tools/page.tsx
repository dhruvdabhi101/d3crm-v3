import Link from "next/link";
import { publicMetadata } from "@/lib/site/seo";

export const metadata = publicMetadata("Free website enquiry tools", "Build campaign links and check website contact forms before launch with free tools from d3CRM. No account required.", "/tools");

export default function ToolsPage() {
  return <><p className="eyebrow">FREE TOOLS</p><h1>A smoother launch starts here.</h1><p className="resource-intro">Two tools for teams connecting website enquiries to a shared workflow. No account required; entered values are processed in your browser.</p><div className="resource-grid"><article className="resource-card"><h2><Link href="/tools/campaign-url-builder">Campaign URL builder</Link></h2><p>Add consistent UTM tags to campaign links so submitted enquiries can carry useful source context.</p><Link className="text-link" href="/tools/campaign-url-builder">Build a campaign link →</Link></article><article className="resource-card"><h2><Link href="/tools/form-launch-checklist">Form launch checklist</Link></h2><p>Review fields, origins, live submissions, and team access. Copy or print your checklist for a client handover.</p><Link className="text-link" href="/tools/form-launch-checklist">Check your launch →</Link></article></div><p className="resource-section">New to d3CRM? <Link href="/guides/connect-website-forms">Read the website form integration guide</Link>.</p></>;
}
