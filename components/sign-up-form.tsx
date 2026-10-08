"use client";

import { ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { callbackPath } from "@/lib/navigation";

export default function SignUpForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const data = { name: form.get("name"), email: form.get("email"), password: form.get("password"), organization: form.get("organization") };
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!response.ok) { const body = await response.json(); setError(body.error ?? "Could not create your account."); setPending(false); return; }
      await signIn("credentials", { email: data.email, password: data.password, callbackUrl: callbackPath(window.location.search) });
    } catch { setError("Could not connect. Try again."); setPending(false); }
  }
  return <section className="auth-card"><div className="auth-heading"><p className="eyebrow">GET STARTED</p><h1>Create your workspace.</h1><p>Your private workspace is created automatically.</p></div><form onSubmit={submit} className="auth-form"><div className="two-fields"><label className="field"><span>Your name</span><input name="name" autoComplete="name" required minLength={2} maxLength={80} /></label><label className="field"><span>Organization</span><input name="organization" autoComplete="organization" required minLength={2} maxLength={100} /></label></div><label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required /></label><label className="field"><span>Password</span><input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /><small>At least 8 characters.</small></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-wide" disabled={pending}>{pending ? "Creating workspace…" : <>Create workspace <ArrowRight size={16} /></>}</button></form><p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p></section>;
}
