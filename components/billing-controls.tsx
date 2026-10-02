"use client";
import { useActionState } from "react";
import { CreditCard } from "lucide-react";
import { openBilling } from "@/lib/actions/billing";
export function BillingControls({ portal }: { portal: boolean }) {
  const [state, action, pending] = useActionState(openBilling, {});
  return <form action={action}>{portal && <input type="hidden" name="portal" value="on" />}{state.error && <p className="form-error" role="alert">{state.error}</p>}<button className="button button-primary" disabled={pending}><CreditCard size={16} />{pending ? "Opening…" : portal ? "Manage subscription" : "Upgrade to Pro"}</button></form>;
}
