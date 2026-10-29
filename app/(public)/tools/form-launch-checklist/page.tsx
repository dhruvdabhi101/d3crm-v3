import Link from "next/link";
import { FormLaunchChecklist } from "@/components/form-launch-checklist";
import { publicMetadata } from "@/lib/site/seo";

export const metadata = publicMetadata("Free website contact form launch checklist", "Check form fields, website origins, endpoint validation, live enquiries, and team access before launching a d3CRM website integration.", "/tools/form-launch-checklist");

export default function ChecklistPage() {
  return <><Link className="back-link" href="/tools">← Free tools</Link><h1>Form launch checklist</h1><p className="resource-intro">Check your website, then copy or print the results. No account needed.</p><FormLaunchChecklist /><section className="resource-section"><h2>Test mode and live mode answer different questions.</h2><p>Test mode validates the key, live status, origin, and submitted fields without creating an enquiry. One intentional live submission confirms that an enquiry reaches the inbox. Email and webhook delivery need their own checks if you use them.</p><Link href="/guides/connect-website-forms">Read the connection guide →</Link></section></>;
}
