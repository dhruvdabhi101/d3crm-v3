"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { acceptInvitation } from "@/lib/actions/organization";
export function AcceptInvitation({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvitation, {});
  return <form action={action}><input type="hidden" name="token" value={token} />{state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}<Button variant="default" className="button button-primary" disabled={pending}><UserPlus size={16} />{pending ? "Joining…" : "Accept invitation"}</Button></form>;
}
