import Link from "next/link";
import { publicMetadata } from "@/lib/site/seo";

export const metadata = publicMetadata("Free website enquiry tools", "Build campaign links and check website contact forms before launch with free tools from d3CRM. No account required.", "/tools");

export default function ToolsPage() {
  return <><h1>Free tools</h1><p className="resource-intro">No account needed. Your inputs stay in your browser.</p><div className="resource-grid"><article className="resource-card"><h2><Link href="/tools/campaign-url-builder">Campaign URL builder</Link></h2><p>Tag campaign links to identify where enquiries come from.</p><Link className="text-link" href="/tools/campaign-url-builder">Build a campaign link →</Link></article><article className="resource-card"><h2><Link href="/tools/form-launch-checklist">Form launch checklist</Link></h2><p>Check your form before launch, then copy or print the results.</p><Link className="text-link" href="/tools/form-launch-checklist">Check your launch →</Link></article></div><p className="resource-section">New to d3CRM? <Link href="/guides/connect-website-forms">Read the website form integration guide</Link>.</p></>;
}
