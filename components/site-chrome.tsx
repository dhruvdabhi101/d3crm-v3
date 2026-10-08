"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, BookOpen, Link2, ListChecks } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const resources = [{ href: "/guides", label: "Practical guides", icon: BookOpen }, { href: "/tools/campaign-url-builder", label: "Campaign URL builder", icon: Link2 }, { href: "/tools/form-launch-checklist", label: "Form launch checklist", icon: ListChecks }];
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <><a className="skip-link" href="#main-content">Skip to content</a><header className="site-header"><Brand href="/" /><nav className="site-desktop-nav" aria-label="Main navigation"><Link href="/features">The product</Link><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="resources-trigger">Resources <ChevronDown size={14} /></Button></DropdownMenuTrigger><DropdownMenuContent align="start">{resources.map(({ href, label, icon: Icon }) => <DropdownMenuItem asChild key={href}><Link href={href}><Icon />{label}</Link></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu><Link href="/demo">Try the demo <ArrowUpRight size={14} /></Link></nav><div className="site-account"><Link className="site-signin" href="/sign-in">Sign in</Link><Button asChild><Link href="/sign-up">Get started <ArrowUpRight size={15} /></Link></Button><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="site-mobile-menu" aria-label="Open navigation"><Menu /></Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>d3CRM</SheetTitle><SheetDescription>Every enquiry. A clear next step.</SheetDescription></SheetHeader><nav className="site-sheet-nav" aria-label="Mobile navigation">{[{ href: "/features", label: "The product" }, { href: "/demo", label: "Interactive demo" }, ...resources, { href: "/tools", label: "All free tools" }, { href: "/sign-in", label: "Sign in" }].map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}<ArrowUpRight size={16} /></Link>)}</nav></SheetContent></Sheet></div></header></>;
}
export function SiteFooter() {
  return <footer className="site-footer"><div><Brand href="/" /><p>Good enquiries deserve a next step.</p></div><nav aria-label="Footer"><Link href="/features">Product</Link><Link href="/demo">Demo</Link><Link href="/guides">Guides</Link><Link href="/tools">Free tools</Link></nav><span>Built for the work ahead.</span></footer>;
}
