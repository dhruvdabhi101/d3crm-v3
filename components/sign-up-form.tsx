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
  return <section className="auth-card"><div className="auth-heading"><p className="eyebrow">GET STARTED</p><h1>Create your workspace.</h1><p>Your private workspace is created automatically.</p></div><form onSubmit={submit} className="auth-form"><div className="two-fields"><Label className="field"><span>Your name</span><Input name="name" autoComplete="name" required minLength={2} maxLength={80} /></Label><Label className="field"><span>Organization</span><Input name="organization" autoComplete="organization" required minLength={2} maxLength={100} /></Label></div><Label className="field"><span>Email</span><Input name="email" type="email" autoComplete="email" required /></Label><Label className="field"><span>Password</span><Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} /><small>At least 8 characters.</small></Label>{error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}<Button variant="default" className="button button-primary button-wide" disabled={pending}>{pending ? "Creating workspace…" : <>Create workspace <ArrowRight size={16} /></>}</Button></form><p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p></section>;
}
