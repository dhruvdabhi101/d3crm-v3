"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  return <section className="auth-card"><div className="auth-heading"><p className="eyebrow">Welcome back</p><h1>Sign in to d3CRM.</h1><p>Welcome back to your workspace.</p></div><form onSubmit={submit} className="auth-form"><Label className="field"><span>Email</span><Input name="email" type="email" autoComplete="email" required autoFocus /></Label><Label className="field"><span>Password</span><Input name="password" type="password" autoComplete="current-password" required minLength={8} /></Label><Link className="text-link" href="/forgot-password">Forgot password?</Link>{error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}<Button variant="default" className="button button-primary button-wide" disabled={pending}>{pending ? "Signing in…" : <>Sign in <ArrowRight size={16} /></>}</Button></form><p className="auth-switch">New to d3CRM? <Link href="/sign-up">Create an account</Link></p></section>;
}
