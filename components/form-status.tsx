"use client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateFormStatus } from "@/lib/actions/forms";
export function FormStatusControl({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(updateFormStatus, {});
  return <form action={action} className="connection-form"><input type="hidden" name="id" value={id} /><label className="field"><span>Availability</span><select name="status" defaultValue={status}><option value="LIVE">Live</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Archived</option></select></label><button className="button button-secondary" disabled={pending}><Save size={15} />Save</button>{state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}</form>;
}
