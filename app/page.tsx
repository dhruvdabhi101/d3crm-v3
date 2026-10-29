import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Code2, Inbox, Layers3 } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { EnquiryDeskPreview } from "@/components/enquiry-desk-preview";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { jsonLd, siteDescription, siteUrl } from "@/lib/site/seo";
import type { Metadata } from "next";
import { AsciiSculpture } from "@/components/ascii-sculpture";
import "./landing.css";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return <div className="product-site ascii-landing"><SiteHeader /><main id="main-content">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@type": "SoftwareApplication", "@id": `${siteUrl.href}#software`, name: "d3CRM", url: siteUrl.href, description: siteDescription, applicationCategory: "BusinessApplication", operatingSystem: "Web browser", featureList: ["Website contact forms", "Shared enquiry inbox", "Enquiry pipeline", "Follow-up agenda", "Client workspaces", "Campaign reports", "CSV export"], publisher: { "@id": `${siteUrl.href}#organization` } }) }} />
    <section className="product-hero" aria-labelledby="product-title"><div className="hero-copy"><h1 id="product-title">Website forms.<br />Shared inbox.<br /><span>A clear next step.</span></h1><p className="hero-description">Connect your website form. Assign enquiries to your team and track each follow-up.</p><div className="hero-actions"><Button asChild size="lg"><Link href="/demo">Try the live demo <ArrowRight size={16} /></Link></Button><Button asChild variant="outline" size="lg"><Link href="/sign-up">Create a workspace <ArrowUpRight size={16} /></Link></Button></div><p className="hero-footnote"><Link href="/compare">Compared with Formspree and HubSpot</Link></p></div><AsciiSculpture /></section>

    <section className="landing-desk" aria-labelledby="desk-title"><div className="site-section-heading"><h2 id="desk-title">Your team’s inbox.</h2><Link className="text-link" href="/demo">Take a look around <ArrowUpRight size={16} /></Link></div><div className="hero-desk"><EnquiryDeskPreview /><p className="preview-caption">Sample enquiries</p></div></section>
    <section className="site-workflow" id="product"><div className="site-section-heading"><h2>From form to follow-up.</h2></div><div className="workflow-columns"><article><Code2 size={24} /><h3>Use the form you already have.</h3><p>Connect your existing form or embed a generated one.</p><Link className="text-link" href="/guides/connect-website-forms">Connect your website <ArrowUpRight size={14} /></Link></article><article><Inbox size={24} /><h3>Give every enquiry an owner.</h3><p>Assign a teammate manually or use round robin.</p><Link className="text-link" href="/demo">Explore the inbox <ArrowUpRight size={14} /></Link></article><article><CalendarDays size={24} /><h3>Put a date on the next step.</h3><p>Set a follow-up date and keep notes together. Send reply drafts from your email app.</p><Link className="text-link" href="/features">See the workflow <ArrowUpRight size={14} /></Link></article></div></section>
    <section className="site-agencies" id="agencies"><div className="agency-heading"><h2>A dedicated desk<br />for every client.</h2><p>Keep each client’s forms, enquiries, and team access in a separate workspace.</p><Button asChild variant="outline"><Link href="/guides/manage-client-enquiries">Explore client workspaces <ArrowUpRight size={16} /></Link></Button></div><div className="client-workspace-preview"><div className="client-preview-label"><Layers3 size={18} /><span>YOUR CLIENT WORKSPACES</span></div>{[{ name: "Fieldwork Studio", type: "Design & development", initial: "F" }, { name: "Northline", type: "Architecture & interiors", initial: "N" }, { name: "Good Company", type: "Independent retail", initial: "G" }].map((client, index) => <div className="client-preview-row" key={client.name}><span className={`client-mark client-mark-${index}`}>{client.initial}</span><span><strong>{client.name}</strong><small>{client.type}</small></span><ArrowUpRight size={17} /></div>)}<p>Sample workspaces</p></div></section>
    <section className="site-faq"><div className="site-section-heading"><h2>Questions</h2></div><Accordion type="single" collapsible className="faq-items">{[
      { q: "Is this Formspree?", a: <>Form backends collect the submission and email it. d3CRM starts after that: an owner, a status, notes, a follow-up date, and a separate workspace for each client. See <Link href="/compare">how it compares</Link>.</> },
      { q: "Do I have to rebuild my form?", a: <>No, if your site can run a small custom script. The connection wizard can target a form element you already have. Read <Link href="/guides/connect-website-forms">how to connect a website form</Link>.</> },
      { q: "What does it cost?", a: <>Creating a workspace does not start a subscription. There is no paid plan offered on this site yet.</> },
      { q: "Does this replace my website?", a: <>Your website stays yours. d3CRM connects to it through an integration snippet or the form submission API.</> },
      { q: "Can I try it without an account?", a: <>Yes. The <Link href="/demo">interactive demo</Link> uses fictional enquiries. Try the inbox, pipeline, assignments, and follow-ups. Changes reset when you reload.</> },
      { q: "Can my clients have their own access?", a: <>Yes. Create a client workspace and invite the people who need it. Each workspace keeps its own forms, enquiries, and permissions.</> },
      { q: "Does d3CRM send replies to my leads?", a: <>The reply composer prepares a personalised draft. Copy it or open it in your email app. You review and send it yourself.</> },
    ].map(({ q, a }, index) => <AccordionItem value={`question-${index}`} key={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}</Accordion></section>
    <div className="site-resource-note"><span>Getting a website ready for launch?</span><Link href="/guides">Read the guides <ArrowUpRight size={14} /></Link><Link href="/tools">Use the free tools <ArrowUpRight size={14} /></Link></div>
    <section className="site-final"><h2>Try it with your next enquiry.</h2><div className="hero-actions"><Button asChild size="lg"><Link href="/demo">Try the live demo <ArrowRight size={16} /></Link></Button><Link className="text-link" href="/sign-up">Create a workspace <ArrowUpRight size={14} /></Link></div></section>
  </main><SiteFooter /></div>;
}
