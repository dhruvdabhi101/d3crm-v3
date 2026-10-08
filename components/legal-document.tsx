import Link from "next/link";
import { legalUpdated, legalVersion } from "@/lib/legal";
import { legalProfile } from "@/lib/legal-contact";

export function LegalDocument({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <article className="guide-article legal-document"><p className="eyebrow">D3CRM LEGAL · VERSION {legalVersion}</p><h1>{title}</h1><p className="resource-intro">{intro}</p><p className="legal-date">Last updated: {legalUpdated}. Effective when published; contractual terms require acceptance.</p><nav className="legal-nav" aria-label="Legal documents"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/data-processing">Data Processing Agreement</Link><Link href="/account-data-notice">Account Data Notice</Link></nav>{!legalProfile() && <p className="legal-availability" role="status">New account registration is not yet open. The operator’s identity, contact details, and processing locations will be published before registration opens.</p>}{children}</article>;
}

export function LegalContact() {
  const profile = legalProfile();
  return <section className="resource-section" id="contact"><h2>Operator and privacy contact</h2>{profile ? <><p>d3CRM is operated by <strong>{profile.name}</strong>.</p><address>{profile.address}</address><p>Privacy requests, account-consent withdrawal, complaints, and legal notices: <a href={`mailto:${profile.email}`}>{profile.email}</a>. Grievance contact: {profile.grievanceContact}.</p></> : <p>The operator’s public contact details are pending. New registrations remain closed until these details are available.</p>}<p>If your enquiry was submitted on another business’s website, contact that business first: it decides how to use your enquiry. You can also contact the d3CRM operator for help identifying the responsible workspace. We verify identity and authority proportionately before disclosing, changing, or deleting records.</p></section>;
}
