import { Brand } from "@/components/brand";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><div className="auth-story"><Brand href="/" /><div><p className="eyebrow">FROM ENQUIRY TO OPPORTUNITY</p><h2>Good things<br />start with<br />a conversation.</h2><p>One workspace for the people, projects, and possibilities coming through your website.</p></div><small>d3CRM</small></div><div className="auth-shell"><Brand href="/" />{children}<p className="auth-foot">From enquiry to opportunity.</p></div></main>;
}
