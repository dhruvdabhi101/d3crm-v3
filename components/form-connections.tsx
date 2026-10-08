"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateFormConnections } from "@/lib/actions/forms";
import { CopyButton } from "@/components/copy-button";

export function FormConnections({ id, members, emails, url, hasSecret, mailEnabled }: { id: string; members: { email: string; name: string; verified: boolean }[]; emails: string[]; url: string | null; hasSecret: boolean; mailEnabled: boolean }) {
  const [state, action, pending] = useActionState(updateFormConnections.bind(null, id), {});
  return <form action={action} className="connection-form">
    <fieldset><legend>Email alerts</legend>{!mailEnabled && <p className="quiet-note">Email delivery is unavailable. Contact the administrator.</p>}{members.map(member => <Label className="check-field" key={member.email}><Checkbox  name="notificationEmails" value={member.email} defaultChecked={emails.includes(member.email)} disabled={!mailEnabled || !member.verified} /><span>{member.name} <small>{member.verified ? member.email : "Email not verified"}</small></span></Label>)}</fieldset>
    <Label className="field"><span>Webhook URL</span><Input name="webhookUrl" type="url" defaultValue={url ?? ""} placeholder="https://example.com/webhook" maxLength={2000} /></Label>
    {hasSecret && <Label className="check-field"><Checkbox  name="rotateSecret" /><span>Rotate signing secret</span></Label>}
    {state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}{state.success && <Alert className="form-success" role="status"><AlertDescription>{state.success}</AlertDescription></Alert>}
    {state.secret && <div><p className="quiet-note">Signing secret, shown once.</p><div className="secret-row"><code>{state.secret}</code><CopyButton value={state.secret} /></div></div>}
    <Button variant="default" className="button button-primary" disabled={pending}><Save size={16} />{pending ? "Saving…" : "Save connections"}</Button>
  </form>;
}
