"use client";
import { useConfirm } from "@/components/ui-providers";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Send, Trash2 } from "lucide-react";
import { addSubmissionNote, deleteSubmission, updateSubmission } from "@/lib/actions/submissions";
import { LEAD_STATUSES, statusLabel } from "@/lib/leads";

export function SubmissionControls({ id, status, assigneeId, followUpAt, read, updatedAt, members }: { id: string; status: string; assigneeId: string | null; followUpAt: string | null; read: boolean; updatedAt: string; members: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updateSubmission.bind(null, id), {});
  const [draftStatus, setStatus] = useState(status);
  const [draftAssignee, setAssignee] = useState(assigneeId ?? "");
  const [draftFollowUp, setFollowUp] = useState(followUpAt?.slice(0, 10) ?? "");
  const [unread, setUnread] = useState(!read);
  const [loadedVersion, setLoadedVersion] = useState(updatedAt);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (state.success && state.updatedAt) { setLoadedVersion(state.updatedAt); setDirty(false); } }, [state]);
  return <form action={action} className="connection-form" aria-busy={pending}><input type="hidden" name="updatedAt" value={loadedVersion} /><fieldset disabled={pending}>
    <Label className="field"><span>Status</span><NativeSelect aria-label="Status" name="status" value={draftStatus} onChange={event => { setStatus(event.target.value); setDirty(true); }}>{LEAD_STATUSES.map(value => <NativeSelectOption value={value} key={value}>{statusLabel(value)}</NativeSelectOption>)}</NativeSelect></Label>
    <Label className="field"><span>Assigned to</span><NativeSelect aria-label="Assigned to" name="assigneeId" value={draftAssignee} onChange={event => { setAssignee(event.target.value); setDirty(true); }}><NativeSelectOption value="">Unassigned</NativeSelectOption>{members.map(member => <NativeSelectOption key={member.id} value={member.id}>{member.name}</NativeSelectOption>)}</NativeSelect></Label>
    <Label className="field"><span>Follow up</span><Input type="date" name="followUpAt" value={draftFollowUp} onChange={event => { setFollowUp(event.target.value); setDirty(true); }} /></Label>
    <Label className="check-field"><Checkbox  name="unread" checked={unread} onCheckedChange={checked => { setUnread((checked === true)); setDirty(true); }} /><span>Mark unread</span></Label>
    <Button variant="default" className="button button-primary" disabled={pending}><Save size={16} aria-hidden="true" /><span className="button-label"><span aria-hidden="true" className="button-label-size">Save changes</span><span>{pending ? "Saving..." : "Save changes"}</span></span></Button>
  </fieldset>{state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}{state.success && !dirty && !pending && <Alert className="form-success" role="status"><AlertDescription>{state.success}</AlertDescription></Alert>}
  </form>;
}

export function SubmissionNoteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addSubmissionNote.bind(null, id), {});
  const [body, setBody] = useState("");
  useEffect(() => { if (state.success) setBody(""); }, [state]);
  return <form action={action} className="connection-form" aria-busy={pending}><fieldset disabled={pending}><Label className="field"><span>Add note</span><Textarea name="body" rows={3} required maxLength={5000} value={body} onChange={event => setBody(event.target.value)} /></Label><Button variant="outline" className="button button-secondary" disabled={pending}><Send size={15} aria-hidden="true" /><span className="button-label"><span aria-hidden="true" className="button-label-size">Adding...</span><span>{pending ? "Adding..." : "Add note"}</span></span></Button></fieldset>{state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}{state.success && !body && !pending && <Alert className="form-success" role="status"><AlertDescription>{state.success}</AlertDescription></Alert>}</form>;
}

export function DeleteSubmissionButton({ id }: { id: string }) {
  const confirm = useConfirm();
  const [pending, setPending] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  return <div className="delete-enquiry"><Button variant="destructive" type="button" className="button button-secondary danger" disabled={pending} aria-busy={pending} onClick={async () => { if (!await confirm("Permanently delete this enquiry and its notes?")) return; setError(""); setPending(true); try { await deleteSubmission(id); router.push("/submissions"); router.refresh(); } catch { setError("Could not delete. Please try again."); setPending(false); } }}><Trash2 size={15} aria-hidden="true" /><span className="button-label"><span aria-hidden="true" className="button-label-size">Delete enquiry</span><span>{pending ? "Deleting..." : "Delete enquiry"}</span></span></Button>{error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}</div>;
}
