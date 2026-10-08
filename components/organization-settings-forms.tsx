"use client";
import { useConfirm } from "@/components/ui-providers";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";

import { startTransition, useActionState } from "react";
import { addMember, inviteMember, removeMember, transferOwnership, updateOrganization } from "@/lib/actions/organization";
import { Mail, UserMinus } from "lucide-react";

function Result({ error, success }: { error?: string; success?: string }) {
  if (error) return <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{error}</AlertDescription></Alert>;
  if (success) return <Alert className="form-success" role="status"><AlertDescription>{success}</AlertDescription></Alert>;
  return null;
}

export function InviteMemberForm() {
  const [state, action, pending] = useActionState(inviteMember, {});
  return <form action={action} className="invite-form"><Label className="field"><span>Invite by email</span><Input name="email" type="email" required maxLength={254} /></Label><Label className="field"><span>Role</span><NativeSelect aria-label="Role" name="role" defaultValue="MEMBER"><NativeSelectOption value="MEMBER">Member</NativeSelectOption><NativeSelectOption value="VIEWER">Viewer</NativeSelectOption><NativeSelectOption value="ADMIN">Admin</NativeSelectOption></NativeSelect></Label><Button variant="outline" className="button button-secondary" disabled={pending}><Mail size={15} />{pending ? "Sending…" : "Send invitation"}</Button><Result {...state} /></form>;
}

export function RemoveMemberForm({ members }: { members: { id: string; name: string }[] }) {
  const confirm = useConfirm();
  const [state, action, pending] = useActionState(removeMember, {});
  return <form action={action} className="invite-form" onSubmit={async event => { event.preventDefault(); const data = new FormData(event.currentTarget); if (!await confirm("Remove this member's access to the workspace?")) return; startTransition(() => action(data)); }}><Label className="field"><span>Remove access</span><NativeSelect aria-label="Remove access" name="memberId" required defaultValue=""><NativeSelectOption value="" disabled>Choose a member</NativeSelectOption>{members.map(member => <NativeSelectOption key={member.id} value={member.id}>{member.name}</NativeSelectOption>)}</NativeSelect></Label><Button variant="destructive" className="button button-secondary danger" disabled={pending || !members.length}><UserMinus size={15} />Remove member</Button><Result {...state} /></form>;
}

export function OrganizationNameForm({ name, canAdmin }: { name: string; canAdmin: boolean }) {
  const [state, action, pending] = useActionState(updateOrganization, {});
  return <form action={action} className="settings-form"><Label className="field"><span>Name</span><Input name="name" defaultValue={name} disabled={!canAdmin} required minLength={2} maxLength={100} /></Label>{canAdmin && <Button variant="default" className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>}<Result {...state} /></form>;
}

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addMember, {});
  return <form action={action} className="invite-form"><Label className="field"><span>Existing user email</span><Input name="email" type="email" placeholder="teammate@company.com" required /></Label><Label className="field"><span>Role</span><NativeSelect aria-label="Role" name="role" defaultValue="VIEWER"><NativeSelectOption value="VIEWER">Viewer</NativeSelectOption><NativeSelectOption value="MEMBER">Member</NativeSelectOption><NativeSelectOption value="ADMIN">Admin</NativeSelectOption></NativeSelect></Label><Button variant="outline" className="button button-secondary" disabled={pending}>{pending ? "Saving…" : "Add member"}</Button><Result {...state} /></form>;
}

export function TransferOwnershipForm({ members }: { members: { id: string; name: string; email: string }[] }) {
  const confirm = useConfirm();
  const [state, action, pending] = useActionState(transferOwnership, {});
  return <form action={action} className="invite-form transfer-form" onSubmit={async event => { event.preventDefault(); const data = new FormData(event.currentTarget); if (!await confirm("Transfer workspace ownership? The selected member becomes owner and you become an admin.")) return; startTransition(() => action(data)); }}><Label className="field"><span>Transfer ownership to</span><NativeSelect aria-label="Transfer ownership to" name="memberId" required defaultValue=""><NativeSelectOption value="" disabled>Choose a member</NativeSelectOption>{members.map((member) => <NativeSelectOption value={member.id} key={member.id}>{member.name} ({member.email})</NativeSelectOption>)}</NativeSelect><small>The selected member becomes owner. You become an admin.</small></Label><Button variant="outline" className="button button-secondary" disabled={pending || members.length === 0}>{pending ? "Transferring…" : "Transfer ownership"}</Button><Result {...state} /></form>;
}
