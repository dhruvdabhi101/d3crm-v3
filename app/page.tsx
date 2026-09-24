import Link from "next/link";
import { ArrowRight, Code2, Inbox, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <main className="landing">
      <header className="landing-header">
        <Brand href="/" />
        <nav aria-label="Main navigation">
          <Link href="/sign-in">Sign in</Link>
          <Link className="button button-primary" href="/sign-up">Get started <ArrowRight size={15} /></Link>
        </nav>
      </header>
      <section className="landing-hero">
        <p className="eyebrow">Website forms, without the busywork</p>
        <h1>A quiet place for every <em>hello.</em></h1>
        <p>Create forms for your website, collect submissions, and keep every conversation in one thoughtful inbox.</p>
        <Link className="button button-primary" href="/sign-up">Create your workspace <ArrowRight size={16} /></Link>
      </section>
      <section className="landing-features" aria-label="What you can do">
        <article><Code2 size={21} strokeWidth={1.5} /><h2>Build your form</h2><p>Start with a template or use your favorite AI agent to shape the fields you need.</p></article>
        <article><Inbox size={21} strokeWidth={1.5} /><h2>Keep it together</h2><p>See submissions across your forms in one inbox, with CSV export when you need it.</p></article>
        <article><ShieldCheck size={21} strokeWidth={1.5} /><h2>Stay in control</h2><p>Manage your team, choose allowed website origins, and rotate form keys at any time.</p></article>
      </section>
      <footer className="landing-footer"><Brand href="/" /><span>Your forms. Your website. Your workflow.</span></footer>
    </main>
  );
}
