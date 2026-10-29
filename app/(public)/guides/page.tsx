import Link from "next/link";
import { guides } from "@/lib/site/guides";
import { publicMetadata } from "@/lib/site/seo";

export const metadata = publicMetadata("Website forms and lead management guides", "Practical d3CRM guides for connecting contact forms, managing client enquiries, and following up on website leads.", "/guides");

export default function GuidesPage() {
  return <><h1>Guides</h1><div className="resource-grid">{guides.map(guide => <article className="resource-card" key={guide.slug}><h2><Link href={`/guides/${guide.slug}`}>{guide.title}</Link></h2><p>{guide.description}</p><Link className="text-link" href={`/guides/${guide.slug}`}>Read the guide →</Link></article>)}</div><p className="resource-section">Ready to launch? Use the <Link href="/tools/form-launch-checklist">form launch checklist</Link> and <Link href="/tools/campaign-url-builder">campaign URL builder</Link>.</p></>;
}
