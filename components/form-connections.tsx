"use client";
import { useActionState } from "react";
import { Save } from "lucide-react";
import { updateFormConnections } from "@/lib/actions/forms";
import { CopyButton } from "@/components/copy-button";

export function FormConnections({ id, members, emails, url, hasSecret, mailEnabled }: { id: string; members: { email: string; name: string; verified: boolean }[]; emails: string[]; url: string | null; hasSecret: boolean; mailEnabled: boolean }) {
  const [state, action, pending] = useActionState(updateFormConnections.bind(null, id), {});
  return <form action={action} className="connection-form">
    <fieldset><legend>Email alerts</legend>{!mailEnabled && <p className="quiet-note">Email delivery is unavailable. Contact the administrator.</p>}{members.map(member => <label className="check-field" key={member.email}><input type="checkbox" name="notificationEmails" value={member.email} defaultChecked={emails.includes(member.email)} disabled={!mailEnabled || !member.verified} /><span>{member.name} <small>{member.verified ? member.email : "Email not verified"}</small></span></label>)}</fieldset>
    <label className="field"><span>Webhook URL</span><input name="webhookUrl" type="url" defaultValue={url ?? ""} placeholder="https://example.com/webhook" maxLength={2000} /></label>
    {hasSecret && <label className="check-field"><input type="checkbox" name="rotateSecret" /><span>Rotate signing secret</span></label>}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}
    {state.secret && <div><p className="quiet-note">Signing secret, shown once.</p><div className="secret-row"><code>{state.secret}</code><CopyButton value={state.secret} /></div></div>}
    <button className="button button-primary" disabled={pending}><Save size={16} />{pending ? "Saving…" : "Save connections"}</button>
  </form>;
}
