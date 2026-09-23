"use client";

import { ArrowRight } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function SignInPage() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: form.get("email"), password: form.get("password"), redirect: false });
    if (result?.error) { setError("Email or password is incorrect."); setPending(false); return; }
    window.location.href = "/dashboard";
  }
  return <section className="auth-card"><div className="auth-heading"><p className="eyebrow">Welcome back</p><h1>Your forms, in one quiet place.</h1><p>Sign in to see what arrived.</p></div><form onSubmit={submit} className="auth-form"><label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required autoFocus /></label><label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required minLength={8} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary button-wide" disabled={pending}>{pending ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}</button></form><p className="auth-switch">New to d3CRM? <Link href="/sign-up">Create an account</Link></p></section>;
}
