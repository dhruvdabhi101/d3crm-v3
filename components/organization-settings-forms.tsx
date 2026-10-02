"use client";

import { useActionState } from "react";
import { addMember, inviteMember, removeMember, transferOwnership, updateOrganization } from "@/lib/actions/organization";
import { Mail, UserMinus } from "lucide-react";

function Result({ error, success }: { error?: string; success?: string }) {
  if (error) return <p className="form-error" role="alert">{error}</p>;
  if (success) return <p className="form-success" role="status">{success}</p>;
  return null;
}

export function InviteMemberForm() {
  const [state, action, pending] = useActionState(inviteMember, {});
  return <form action={action} className="invite-form"><label className="field"><span>Invite by email</span><input name="email" type="email" required maxLength={254} /></label><label className="field"><span>Role</span><select name="role" defaultValue="MEMBER"><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option><option value="ADMIN">Admin</option></select></label><button className="button button-secondary" disabled={pending}><Mail size={15} />{pending ? "Sending…" : "Send invitation"}</button><Result {...state} /></form>;
}

export function RemoveMemberForm({ members }: { members: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(removeMember, {});
  return <form action={action} className="invite-form" onSubmit={event => { if (!window.confirm("Remove this member's access to the workspace?")) event.preventDefault(); }}><label className="field"><span>Remove access</span><select name="memberId" required defaultValue=""><option value="" disabled>Choose a member</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><button className="button button-secondary danger" disabled={pending || !members.length}><UserMinus size={15} />Remove member</button><Result {...state} /></form>;
}

export function OrganizationNameForm({ name, canAdmin }: { name: string; canAdmin: boolean }) {
  const [state, action, pending] = useActionState(updateOrganization, {});
  return <form action={action} className="settings-form"><label className="field"><span>Name</span><input name="name" defaultValue={name} disabled={!canAdmin} required minLength={2} maxLength={100} /></label>{canAdmin && <button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>}<Result {...state} /></form>;
}

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addMember, {});
  return <form action={action} className="invite-form"><label className="field"><span>Existing user email</span><input name="email" type="email" placeholder="teammate@company.com" required /></label><label className="field"><span>Role</span><select name="role" defaultValue="VIEWER"><option value="VIEWER">Viewer</option><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></label><button className="button button-secondary" disabled={pending}>{pending ? "Saving…" : "Add member"}</button><Result {...state} /></form>;
}

export function TransferOwnershipForm({ members }: { members: { id: string; name: string; email: string }[] }) {
  const [state, action, pending] = useActionState(transferOwnership, {});
  return <form action={action} className="invite-form transfer-form"><label className="field"><span>Transfer ownership to</span><select name="memberId" required defaultValue=""><option value="" disabled>Choose a member</option>{members.map((member) => <option value={member.id} key={member.id}>{member.name} ({member.email})</option>)}</select><small>The selected member becomes owner. You become an admin.</small></label><button className="button button-secondary" disabled={pending || members.length === 0}>{pending ? "Transferring…" : "Transfer ownership"}</button><Result {...state} /></form>;
}
