import { Brand } from "@/components/brand";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-page">
      <div className="auth-story">
        <Brand href="/" />
        <div>
          <h2>Your website enquiries,<br />in one place.</h2>
        </div>
        <small>d3CRM</small>
      </div>
      <div className="auth-shell">
        <Brand href="/" />
        {children}
        <p className="auth-foot">
          <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link>
        </p>
      </div>
    </main>
  );
}
