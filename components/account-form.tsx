"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export function AccountForm({ action, token = "" }: { action: "reset-request" | "reset-password" | "verify-email" | "verification-request"; token?: string }) {
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/account/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token || undefined, email: form.get("email") ?? undefined, password: form.get("password") ?? undefined }) });
      const body = await response.json();
      if (!response.ok) setError(body.error ?? "Please try again."); else setMessage(body.message);
    } catch { setError("Could not connect. Please try again."); } finally { setPending(false); }
  }
  const label = action === "reset-request" ? "Send reset link" : action === "reset-password" ? "Change password" : action === "verify-email" ? "Verify email" : "Send verification email";
  return <form onSubmit={submit} className="auth-form">
    {action === "reset-request" && <Label className="field"><span>Email</span><Input name="email" type="email" autoComplete="email" required maxLength={254} /></Label>}
    {action === "reset-password" && <Label className="field"><span>New password</span><Input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} /><small>At least 8 characters; at most 72 bytes.</small></Label>}
    {error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
    {message ? <><Alert className="form-success" role="status"><AlertDescription>{message}</AlertDescription></Alert><Link className="text-link" href={action === "verify-email" ? "/settings" : "/sign-in"}>{action === "verify-email" ? "Open settings" : "Back to sign in"}<ArrowRight size={15} /></Link></> : <Button variant="default" className="button button-primary" disabled={pending || ((action === "verify-email" || action === "reset-password") && !token)}>{action.includes("request") && <Mail size={16} />}{pending ? "Please wait…" : label}</Button>}
  </form>;
}
