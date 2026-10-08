"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateFormStatus } from "@/lib/actions/forms";
export function FormStatusControl({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(updateFormStatus, {});
  return <form action={action} className="connection-form"><input type="hidden" name="id" value={id} /><Label className="field"><span>Availability</span><NativeSelect aria-label="Availability" name="status" defaultValue={status}><NativeSelectOption value="LIVE">Live</NativeSelectOption><NativeSelectOption value="DRAFT">Draft</NativeSelectOption><NativeSelectOption value="ARCHIVED">Archived</NativeSelectOption></NativeSelect></Label><Button variant="outline" className="button button-secondary" disabled={pending}><Save size={15} />Save</Button>{state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}{state.success && <Alert className="form-success" role="status"><AlertDescription>{state.success}</AlertDescription></Alert>}</form>;
}
