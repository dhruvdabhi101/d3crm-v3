"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import { useActionState } from "react";
import { CreditCard } from "lucide-react";
import { openBilling } from "@/lib/actions/billing";
export function BillingControls({ portal }: { portal: boolean }) {
  const [state, action, pending] = useActionState(openBilling, {});
  return <form action={action}>{portal && <input type="hidden" name="portal" value="on" />}{state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}<Button variant="default" className="button button-primary" disabled={pending}><CreditCard size={16} />{pending ? "Opening…" : portal ? "Manage subscription" : "Upgrade to Pro"}</Button></form>;
}
