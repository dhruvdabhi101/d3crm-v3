import Link from "next/link";
import { guides } from "@/lib/site/guides";
import { publicMetadata } from "@/lib/site/seo";

export const metadata = publicMetadata("Website forms and lead management guides", "Practical d3CRM guides for connecting contact forms, managing client enquiries, and following up on website leads.", "/guides");

export default function GuidesPage() {
  return <><p className="eyebrow">PRACTICAL GUIDES</p><h1>Turn website enquiries into a shared workflow.</h1><p className="resource-intro">Start with a working form connection, give each enquiry an owner, and keep the next action visible.</p><div className="resource-grid">{guides.map(guide => <article className="resource-card" key={guide.slug}><h2><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2><p>{guide.description}</p><Link className="text-link" href={`/guides/${guide.slug}`}>Read the guide →</Link></article>)}</div><p className="resource-section">Ready to launch? Use the <Link href="/tools/form-launch-checklist">form launch checklist</Link> and <Link href="/tools/campaign-url-builder">campaign URL builder</Link>.</p></>;
}
