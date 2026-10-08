"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { updateRouting } from "@/lib/actions/forms";

export function FormRouting({ id, updatedAt, mode, defaultId, memberIds, minutes, members }: { id: string; updatedAt: string; mode: string; defaultId: string | null; memberIds: string[]; minutes: number | null; members: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updateRouting.bind(null, id), {});
  const [selected, setSelected] = useState(mode);
  const ids = new Set(members.map(member => member.id));
  const unavailable = Boolean(defaultId && !ids.has(defaultId)) || memberIds.some(id => !ids.has(id));
  return <form action={action} className="routing-form"><input type="hidden" name="updatedAt" value={updatedAt} /><Label className="field"><span>Assignment</span><NativeSelect aria-label="Assignment" name="assignmentMode" value={selected} onChange={event => setSelected(event.target.value)}><NativeSelectOption value="NONE">Manual</NativeSelectOption><NativeSelectOption value="DEFAULT">Default assignee</NativeSelectOption><NativeSelectOption value="ROUND_ROBIN">Round robin</NativeSelectOption></NativeSelect></Label>
    {selected === "DEFAULT" && <Label className="field"><span>Default assignee</span><NativeSelect aria-label="Default assignee" name="defaultAssigneeId" defaultValue={defaultId && ids.has(defaultId) ? defaultId : ""} required><NativeSelectOption value="" disabled>Choose a member</NativeSelectOption>{members.map(member => <NativeSelectOption key={member.id} value={member.id}>{member.name}</NativeSelectOption>)}</NativeSelect></Label>}
    {selected === "ROUND_ROBIN" && <fieldset className="routing-members"><legend>Rotation members</legend>{members.map(member => <Label className="check-field" key={member.id}><Checkbox name="assignmentMemberIds" value={member.id} defaultChecked={memberIds.includes(member.id)} /><span>{member.name}</span></Label>)}</fieldset>}
    {unavailable && <Alert variant="destructive" role="status" className="form-error"><AlertDescription>A configured assignee no longer has write access. Update the selection.</AlertDescription></Alert>}
    <Label className="field"><span>Alert when still unassigned</span><NativeSelect aria-label="Alert when still unassigned" name="unassignedAlertMinutes" defaultValue={minutes ?? 0}><NativeSelectOption value="0">Off</NativeSelectOption>{[15,30,60,120,240,1440].map(value => <NativeSelectOption value={value} key={value}>{value < 60 ? `${value} minutes` : value === 60 ? "1 hour" : value < 1440 ? `${value / 60} hours` : "1 day"}</NativeSelectOption>)}</NativeSelect></Label><p className="quiet-note">Alerts use the configured notification recipients and delivery schedule.</p><Button variant="outline" className="button button-secondary" disabled={pending}><Save size={15} />{pending ? "Saving..." : "Save routing"}</Button>{state.error && <Alert variant="destructive" role="alert" className="form-error"><AlertDescription>{state.error}</AlertDescription></Alert>}{state.success && <Alert role="status" className="form-success"><AlertDescription>{state.success}</AlertDescription></Alert>}
  </form>;
}
