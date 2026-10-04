"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { updateRouting } from "@/lib/actions/forms";

export function FormRouting({ id, updatedAt, mode, defaultId, memberIds, minutes, members }: { id: string; updatedAt: string; mode: string; defaultId: string | null; memberIds: string[]; minutes: number | null; members: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(updateRouting.bind(null, id), {});
  const [selected, setSelected] = useState(mode);
  const ids = new Set(members.map(member => member.id));
  const unavailable = Boolean(defaultId && !ids.has(defaultId)) || memberIds.some(id => !ids.has(id));
  return <form action={action} className="routing-form"><input type="hidden" name="updatedAt" value={updatedAt} /><label className="field"><span>Assignment</span><select name="assignmentMode" value={selected} onChange={event => setSelected(event.target.value)}><option value="NONE">Manual</option><option value="DEFAULT">Default assignee</option><option value="ROUND_ROBIN">Round robin</option></select></label>
    {selected === "DEFAULT" && <label className="field"><span>Default assignee</span><select name="defaultAssigneeId" defaultValue={defaultId && ids.has(defaultId) ? defaultId : ""} required><option value="" disabled>Choose a member</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>}
    {selected === "ROUND_ROBIN" && <fieldset className="routing-members"><legend>Rotation members</legend>{members.map(member => <label className="check-field" key={member.id}><input name="assignmentMemberIds" type="checkbox" value={member.id} defaultChecked={memberIds.includes(member.id)} /><span>{member.name}</span></label>)}</fieldset>}
    {unavailable && <p role="status" className="form-error">A configured assignee no longer has write access. Update the selection.</p>}
    <label className="field"><span>Alert when still unassigned</span><select name="unassignedAlertMinutes" defaultValue={minutes ?? 0}><option value="0">Off</option>{[15,30,60,120,240,1440].map(value => <option value={value} key={value}>{value < 60 ? `${value} minutes` : value === 60 ? "1 hour" : value < 1440 ? `${value / 60} hours` : "1 day"}</option>)}</select></label><p className="quiet-note">Alerts use the configured notification recipients and delivery schedule.</p><button className="button button-secondary" disabled={pending}><Save size={15} />{pending ? "Saving..." : "Save routing"}</button>{state.error && <p role="alert" className="form-error">{state.error}</p>}{state.success && <p role="status" className="form-success">{state.success}</p>}
  </form>;
}
