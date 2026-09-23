import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="auth-page"><div className="auth-glow" aria-hidden /><div className="auth-shell"><Brand />{children}<p className="auth-foot">Private by default. Built for focused teams.</p></div></main>;
}
