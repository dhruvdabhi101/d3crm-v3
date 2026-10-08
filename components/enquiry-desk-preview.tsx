import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, Inbox, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EnquiryDeskPreview() {
  return <Card className="desk-preview"><div className="desk-preview-heading"><span className="desk-workspace-mark">F</span><div><strong>Fieldwork Studio</strong><small>Sample workspace</small></div><Badge variant="outline">A look inside</Badge></div><div className="desk-preview-title"><span><Inbox size={18} />Inbox</span><Link href="/demo" aria-label="Open interactive inbox demo"><ArrowUpRight size={18} /></Link></div><div className="desk-preview-enquiries">{[
    { initials: "MR", name: "Maya Reynolds", subject: "A new home for our brand", status: "NEW", label: "New", owner: "Unassigned" },
    { initials: "JL", name: "Jordan Lee", subject: "Website for a growing team", status: "CONTACTED", label: "Contacted", owner: "Alex" },
    { initials: "SK", name: "Samira Khan", subject: "Let’s talk about our launch", status: "QUALIFIED", label: "Qualified", owner: "Jamie" },
  ].map(lead => <Link href="/demo" className="desk-preview-row" key={lead.initials}><span className="contact-avatar">{lead.initials}</span><span className="desk-contact"><strong>{lead.name}</strong><small>{lead.subject}</small></span><Badge variant="secondary" className="lead-status" data-status={lead.status}>{lead.label}</Badge><ArrowUpRight size={14} /></Link>)}</div><div className="desk-next-step"><span className="desk-note-icon"><CalendarDays size={18} /></span><div><small>THE NEXT CONVERSATION</small><strong>Follow up with Jordan</strong><span>Context kept. Someone responsible. A next step.</span></div></div><div className="desk-preview-footer"><span><MessageSquare size={14} />Good work starts here.</span><Button asChild variant="ghost" size="sm"><Link href="/demo">Try it yourself <ArrowRight size={14} /></Link></Button></div></Card>;
}
