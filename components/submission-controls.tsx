"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Send, Trash2 } from "lucide-react";
import { addSubmissionNote, deleteSubmission, updateSubmission } from "@/lib/actions/submissions";
import { LEAD_STATUSES, statusLabel } from "@/lib/leads";

export function SubmissionControls({ id, status, assigneeId, followUpAt, read, updatedAt, members }: { id: string; status: string; assigneeId: string | null; followUpAt: string | null; read: boolean; updatedAt: string; members: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updateSubmission.bind(null, id), {});
  return <form key={updatedAt} action={action} className="connection-form"><input type="hidden" name="updatedAt" value={updatedAt} />
    <label className="field"><span>Status</span><select name="status" defaultValue={status}>{LEAD_STATUSES.map(value => <option value={value} key={value}>{statusLabel(value)}</option>)}</select></label>
    <label className="field"><span>Assigned to</span><select name="assigneeId" defaultValue={assigneeId ?? ""}><option value="">Unassigned</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
    <label className="field"><span>Follow up</span><input type="date" name="followUpAt" defaultValue={followUpAt?.slice(0, 10) ?? ""} /></label>
    <label className="check-field"><input type="checkbox" name="unread" defaultChecked={!read} /><span>Mark unread</span></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}
    <button className="button button-primary" disabled={pending}><Save size={16} />{pending ? "Saving…" : "Save changes"}</button>
  </form>;
}

export function SubmissionNoteForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(addSubmissionNote.bind(null, id), {});
  return <form action={action} className="connection-form"><label className="field"><span>Add note</span><textarea name="body" rows={3} required maxLength={5000} /></label>{state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p className="form-success" role="status">{state.success}</p>}<button className="button button-secondary" disabled={pending}><Send size={15} />{pending ? "Adding…" : "Add note"}</button></form>;
}

export function DeleteSubmissionButton({ id }: { id: string }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState(""); const router = useRouter();
  return <div><button className="button button-secondary danger" disabled={pending} onClick={async () => { if (!window.confirm("Permanently delete this enquiry and its notes?")) return; setPending(true); try { await deleteSubmission(id); router.push("/submissions"); router.refresh(); } catch { setError("Could not delete. Please try again."); setPending(false); } }}><Trash2 size={15} />{pending ? "Deleting…" : "Delete enquiry"}</button>{error && <p className="form-error" role="alert">{error}</p>}</div>;
}
