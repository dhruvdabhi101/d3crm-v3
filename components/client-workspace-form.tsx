"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/actions/organization";

export function ClientWorkspaceForm() {
  const [state, action, pending] = useActionState(createClient, {});
  return <form action={action} className="client-create"><label className="field"><span>Client name</span><input name="name" required minLength={2} maxLength={100} /></label><label className="field"><span>Website · optional</span><input name="website" type="url" maxLength={2048} placeholder="https://client.com" /></label><button className="button button-primary" disabled={pending}><Plus size={16} />{pending ? "Creating..." : "Create client workspace"}</button>{state.error && <p role="alert" className="form-error">{state.error}</p>}{state.success && <p role="status" className="form-success">{state.success}</p>}</form>;
}
