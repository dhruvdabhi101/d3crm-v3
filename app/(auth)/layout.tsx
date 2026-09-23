import { Brand } from "@/components/brand";
import { ArrowUpRight } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><div className="auth-story"><Brand /><div><p className="eyebrow">A place for your conversations</p><h2>It starts<br />with a simple<br /><em>hello.</em></h2><p>Forms for your website. A thoughtful inbox for your team. A little less work between you and your next connection.</p><span className="auth-story-note">Build with the AI you already use <ArrowUpRight size={16} /></span></div><small>DESIGNED TO GET OUT OF YOUR WAY.</small></div><div className="auth-shell"><Brand />{children}<p className="auth-foot">Your forms. Your website. Your workflow.</p></div></main>;
}
