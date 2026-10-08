import { Brand } from "@/components/brand";
import type { Metadata } from "next";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><div className="auth-story"><Brand href="/" /><div><p className="eyebrow">FROM ENQUIRY TO OPPORTUNITY</p><h2>Good work starts<br />with a <em>hello.</em></h2><p>A calm home for the people, projects, and possibilities coming through your website.</p><ol className="auth-thread" aria-label="The enquiry workflow"><li><span>01</span>A new conversation</li><li><span>02</span>Someone on it</li><li><span>03</span>A clear next step</li></ol></div><small>d3CRM</small></div><div className="auth-shell"><Brand href="/" />{children}<p className="auth-foot">From enquiry to opportunity.</p></div></main>;
}
