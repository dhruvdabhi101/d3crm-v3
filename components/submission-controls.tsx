"use client";
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
    <label className="field"><span>Status</span><select name="status" value={draftStatus} onChange={event => { setStatus(event.target.value); setDirty(true); }}>{LEAD_STATUSES.map(value => <option value={value} key={value}>{statusLabel(value)}</option>)}</select></label>
    <label className="field"><span>Assigned to</span><select name="assigneeId" value={draftAssignee} onChange={event => { setAssignee(event.target.value); setDirty(true); }}><option value="">Unassigned</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
    <label className="field"><span>Follow up</span><input type="date" name="followUpAt" value={draftFollowUp} onChange={event => { setFollowUp(event.target.value); setDirty(true); }} /></label>
    <label className="check-field"><input type="checkbox" name="unread" checked={unread} onChange={event => { setUnread(event.target.checked); setDirty(true); }} /><span>Mark unread</span></label>
    <button className="button button-primary" disabled={pending}><Save size={16} aria-hidden="true" /><span className="button-label"><span aria-hidden="true" className="button-label-size">Save changes</span><span>{pending ? "Saving..." : "Save changes"}</span></span></button>
  </fieldset>{state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && !dirty && !pending && <p className="form-success" role="status">{state.success}</p>}
  </form>;
}

export function SubmissionNoteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addSubmissionNote.bind(null, id), {});
  const [body, setBody] = useState("");
  useEffect(() => { if (state.success) setBody(""); }, [state]);
  return <form action={action} className="connection-form" aria-busy={pending}><fieldset disabled={pending}><label className="field"><span>Add note</span><textarea name="body" rows={3} required maxLength={5000} value={body} onChange={event => setBody(event.target.value)} /></label><button className="button button-secondary" disabled={pending}><Send size={15} aria-hidden="true" /><span className="button-label"><span aria-hidden="true" className="button-label-size">Adding...</span><span>{pending ? "Adding..." : "Add note"}</span></span></button></fieldset>{state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && !body && !pending && <p className="form-success" role="status">{state.success}</p>}</form>;
}

export function DeleteSubmissionButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  return <div className="delete-enquiry"><button type="button" className="button button-secondary danger" disabled={pending} aria-busy={pending} onClick={async () => { if (!window.confirm("Permanently delete this enquiry and its notes?")) return; setError(""); setPending(true); try { await deleteSubmission(id); router.push("/submissions"); router.refresh(); } catch { setError("Could not delete. Please try again."); setPending(false); } }}><Trash2 size={15} aria-hidden="true" /><span className="button-label"><span aria-hidden="true" className="button-label-size">Delete enquiry</span><span>{pending ? "Deleting..." : "Delete enquiry"}</span></span></button>{error && <p className="form-error" role="alert">{error}</p>}</div>;
}
