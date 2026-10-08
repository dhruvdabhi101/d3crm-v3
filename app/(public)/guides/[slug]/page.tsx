import Link from "next/link";
import { notFound } from "next/navigation";
import { guides } from "@/lib/site/guides";
import { breadcrumb, jsonLd, publicMetadata, siteUrl } from "@/lib/site/seo";

export const dynamicParams = false;
export function generateStaticParams() { return guides.map(guide => ({ slug: guide.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guides.find(item => item.slug === slug);
  if (!guide) notFound();
  return publicMetadata(guide.title, guide.description, `/guides/${slug}`);
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guides.find(item => item.slug === slug);
  if (!guide) notFound();
  const path = `/guides/${slug}`;
  const related = guides.find(item => item.slug === guide.related)!;
  const schema = { "@context": "https://schema.org", "@type": "TechArticle", headline: guide.title, description: guide.description, url: new URL(path, siteUrl).href, author: { "@type": "Organization", name: "d3CRM", url: siteUrl.href }, publisher: { "@id": `${siteUrl.href}#organization` }, about: { "@id": `${siteUrl.href}#software` }, inLanguage: "en" };
  return <article className="guide-article"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb([{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }, { name: guide.title, path }])) }} /><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/guides">Guides</Link><span aria-hidden="true">/</span><span aria-current="page">{guide.title}</span></nav><p className="eyebrow">D3CRM GUIDE</p><h1>{guide.title}</h1><p className="resource-intro">{guide.intro}</p><nav className="guide-contents" aria-label="On this page"><strong>On this page</strong><ol>{guide.sections.map((section, index) => <li key={section.title}><a href={`#step-${index + 1}`}>{section.title}</a></li>)}</ol></nav>{guide.sections.map((section, index) => <section className="resource-section" id={`step-${index + 1}`} key={section.title}><h2>{section.title}</h2><p>{section.body}</p></section>)}<aside className="resource-section"><h2>Keep going</h2><p><Link href={`/guides/${related.slug}`}>{related.title}</Link></p><p><Link href="/tools/form-launch-checklist">Check your form before launch</Link> or <Link href="/demo">explore the fictional demo workspace</Link>.</p></aside></article>;
}
