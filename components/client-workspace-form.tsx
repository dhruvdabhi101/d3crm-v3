"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/actions/organization";

export function ClientWorkspaceForm() {
  const [state, action, pending] = useActionState(createClient, {});
  return <form action={action} className="client-create"><Label className="field"><span>Client name</span><Input name="name" required minLength={2} maxLength={100} /></Label><Label className="field"><span>Website · optional</span><Input name="website" type="url" maxLength={2048} placeholder="https://client.com" /></Label><Button variant="default" className="button button-primary" disabled={pending}><Plus size={16} />{pending ? "Creating..." : "Create client workspace"}</Button>{state.error && <Alert variant="destructive" role="alert" className="form-error"><AlertDescription>{state.error}</AlertDescription></Alert>}{state.success && <Alert role="status" className="form-success"><AlertDescription>{state.success}</AlertDescription></Alert>}</form>;
}
