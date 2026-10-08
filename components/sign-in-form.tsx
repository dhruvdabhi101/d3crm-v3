"use client";

import { ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { callbackPath } from "@/lib/navigation";

export default function SignInForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    let result;
    try { result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false }); }
    catch { setError("Could not connect. Try again."); setPending(false); return; }
    if (!result?.ok) { setError("Unable to sign in. Check your details, or wait before trying again."); setPending(false); return; }
    window.location.href = callbackPath(window.location.search);
  }
  return <section className="auth-card"><div className="auth-heading"><p className="eyebrow">Welcome back</p><h1>Sign in to d3CRM.</h1><p>Welcome back to your workspace.</p></div><form onSubmit={submit} className="auth-form"><label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required autoFocus /></label><label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required minLength={8} /></label><Link className="text-link" href="/forgot-password">Forgot password?</Link>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-wide" disabled={pending}>{pending ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}</button></form><p className="auth-switch">New to d3CRM? <Link href="/sign-up">Create an account</Link></p></section>;
}
