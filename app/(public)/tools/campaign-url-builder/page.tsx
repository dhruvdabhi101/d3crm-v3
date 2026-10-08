import Link from "next/link";
import { CampaignUrlBuilder } from "@/components/campaign-url-builder";
import { publicMetadata } from "@/lib/site/seo";

export const metadata = publicMetadata("Free campaign URL builder for website enquiries", "Create UTM campaign links with source, medium, campaign, term, and content tags. Copy your URL without an account or an external service.", "/tools/campaign-url-builder");

export default function CampaignPage() {
  return <><Link className="back-link" href="/tools">← Free tools</Link><p className="eyebrow">CAMPAIGN URL BUILDER</p><h1>Give every campaign a clear source.</h1><p className="resource-intro">Add UTM tags to the links you share in email, ads, or social posts. Use consistent names to make reported enquiry sources easier to compare.</p><CampaignUrlBuilder /><section className="resource-section"><h2>What do the UTM fields mean?</h2><dl className="utm-definitions"><dt>Source</dt><dd>Where the link is shared, such as newsletter or a social platform.</dd><dt>Medium</dt><dd>The channel, such as email, social, or cpc.</dd><dt>Campaign</dt><dd>The initiative, such as autumn-launch.</dd><dt>Term</dt><dd>An optional paid keyword or audience label.</dd><dt>Content</dt><dd>An optional label to distinguish links, such as header-link.</dd></dl><h2>How does this work with d3CRM?</h2><p>The generated website integration can submit current-page campaign parameters with an enquiry. A tagged link alone does not install tracking or connect a form. If the visitor moves to another page and the tags are lost, this tool does not preserve them. d3CRM reports submitted enquiry context rather than visitor analytics.</p><Link href="/guides/connect-website-forms">Connect your website form and campaign context →</Link></section></>;
}
