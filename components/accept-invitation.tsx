"use client";
import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { acceptInvitation } from "@/lib/actions/organization";
export function AcceptInvitation({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvitation, {});
  return <form action={action}><input type="hidden" name="token" value={token} />{state.error && <p className="form-error" role="alert">{state.error}</p>}<button className="button button-primary" disabled={pending}><UserPlus size={16} />{pending ? "Joining…" : "Accept invitation"}</button></form>;
}
