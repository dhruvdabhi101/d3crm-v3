"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Check, Inbox, MoveRight, X } from "lucide-react";
import type { SubmissionState } from "@/lib/actions/submissions";
import { requestBulkUpdate } from "@/lib/bulk-update-request";
import { LEAD_STATUSES, statusLabel } from "@/lib/leads";

export type InboxLead = { id: string; updatedAt: string; status: string; read: boolean; formName: string; assigneeName: string | null; followUpAt: string | null; createdAt: string; preview: [string, string][] };
type Member = { id: string; name: string };
function received(value: string) { return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }); }

export function InboxResults({ leads, members, canWrite }: { leads: InboxLead[]; members: Member[]; canWrite: boolean }) {
  const [selection, setSelection] = useState<{ id: string; updatedAt: string }[]>([]);
  const [kind, setKind] = useState("status");
  const [value, setValue] = useState("CONTACTED");
  const [state, setState] = useState<SubmissionState>({});
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const selected = selection.filter(item => leads.some(lead => lead.id === item.id && lead.updatedAt === item.updatedAt));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const data = new FormData(event.currentTarget);
    saving.current = true;
    setPending(true);
    setState({});
    try {
      const result = await requestBulkUpdate(data);
      setState(result);
      if (result.success) { setSelection([]); window.location.reload(); }
    } catch { setState({ error: "Could not confirm the update. Reload the inbox before trying again." }); }
    finally { saving.current = false; setPending(false); }
  }
  const change = { kind, value: kind === "read" ? value === "read" : kind === "assignee" ? value || null : value };
  const select = (lead: InboxLead, checked: boolean) => setSelection(previous => checked ? [...previous.filter(item => item.id !== lead.id), { id: lead.id, updatedAt: lead.updatedAt }] : previous.filter(item => item.id !== lead.id));
  return <>
    {canWrite && selected.length > 0 && <form className="bulk-toolbar" onSubmit={submit} aria-busy={pending} aria-label="Bulk enquiry updates"><input type="hidden" name="payload" value={JSON.stringify({ items: selected, change })} /><fieldset disabled={pending}>
      <span className="bulk-count" aria-live="polite">{selected.length} selected</span>
      <Label className="field"><span>Update</span><NativeSelect aria-label="Bulk update field" value={kind} onChange={event => { const next = event.target.value; setKind(next); setValue(next === "status" ? "CONTACTED" : next === "read" ? "read" : ""); }}><NativeSelectOption value="status">Status</NativeSelectOption><NativeSelectOption value="assignee">Assignee</NativeSelectOption><NativeSelectOption value="read">Read flag</NativeSelectOption><NativeSelectOption value="followup">Follow-up date</NativeSelectOption></NativeSelect></Label>
      <Label className="field"><span>{kind === "followup" ? "Date (UTC)" : "Value"}</span>{kind === "followup" ? <Input type="date" aria-label="Bulk follow-up date" value={value} onChange={event => setValue(event.target.value)} /> : <NativeSelect aria-label="Bulk update value" value={value} onChange={event => setValue(event.target.value)}>{kind === "status" ? LEAD_STATUSES.map(status => <NativeSelectOption key={status} value={status}>{statusLabel(status)}</NativeSelectOption>) : kind === "read" ? <><NativeSelectOption value="read">Read</NativeSelectOption><NativeSelectOption value="unread">Unread</NativeSelectOption></> : <><NativeSelectOption value="">Unassigned</NativeSelectOption>{members.map(member => <NativeSelectOption key={member.id} value={member.id}>{member.name}</NativeSelectOption>)}</>}</NativeSelect>}</Label>
      <Button variant="default" className="button button-primary" disabled={!selected.length}><Check size={16} />{pending ? "Saving..." : "Apply"}</Button>
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" type="button" aria-label="Clear selection" disabled={!selected.length} onClick={() => setSelection([])}><X size={18} /></Button></TooltipTrigger><TooltipContent>{"Clear selection"}</TooltipContent></Tooltip>
    </fieldset>{state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}{state.success && <Alert className="form-success" role="status"><AlertDescription>{state.success}</AlertDescription></Alert>}</form>}
    <div className="submission-table selectable-table">
      <div className={`inbox-list-head ${canWrite ? "with-selection" : ""}`}>
        {canWrite && <Checkbox aria-label="Select all enquiries on this page" disabled={pending} checked={selected.length > 0 && selected.length < leads.length ? "indeterminate" : leads.length > 0 && selected.length === leads.length} onCheckedChange={checked => setSelection((checked === true) ? leads.map(lead => ({ id: lead.id, updatedAt: lead.updatedAt })) : [])} />}
        <div className="table-head workspace-inbox-head"><span>Enquiry</span><span>Form</span><span>Status</span><span>Assigned to</span><span>Received · UTC</span></div>
      </div>
      {leads.map(lead => <div className={`inbox-list-row ${canWrite ? "with-selection" : ""}`} key={lead.id}>
        {canWrite && <Checkbox aria-label={`Select enquiry ${lead.preview[0]?.[1] || lead.formName}`} checked={selected.some(item => item.id === lead.id)} disabled={pending} onCheckedChange={checked => select(lead, (checked === true))} />}
        <Link className={`table-row enquiry-row workspace-enquiry-row ${lead.read ? "" : "enquiry-unread"}`} href={`/submissions/${lead.id}`}><span className="workspace-enquiry-contact"><span className="contact-avatar" aria-hidden><Inbox size={16} /></span><span><strong>{lead.preview[0]?.[1] || "Enquiry"}{!lead.read && <i className="unread-dot" aria-label="Unread" />}</strong><small>{lead.preview.slice(1).map(([, answer]) => answer).join(" · ")}</small>{lead.followUpAt && <small className="lead-due">Follow up {lead.followUpAt.slice(0, 10)}</small>}</span></span><span className="workspace-enquiry-form">{lead.formName}</span><Badge variant="secondary" className="lead-status" data-status={lead.status}>{statusLabel(lead.status)}</Badge><span className="workspace-enquiry-assignee">{lead.assigneeName ?? "Unassigned"}</span><time dateTime={lead.createdAt} title={new Date(lead.createdAt).toISOString()}>{received(lead.createdAt)}</time></Link>
      </div>)}
    </div>
  </>;
}

export function PipelineMove({ lead }: { lead: InboxLead }) {
  const [status, setStatus] = useState(lead.status);
  const [state, setState] = useState<SubmissionState>({});
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const data = new FormData(event.currentTarget);
    saving.current = true;
    setPending(true);
    setState({});
    try {
      const result = await requestBulkUpdate(data);
      setState(result);
      if (result.success) window.location.reload();
    } catch { setState({ error: "Could not confirm the move. Reload the inbox before trying again." }); }
    finally { saving.current = false; setPending(false); }
  }
  return <form onSubmit={submit} className="pipeline-move" aria-busy={pending}><input type="hidden" name="payload" value={JSON.stringify({ items: [{ id: lead.id, updatedAt: lead.updatedAt }], change: { kind: "status", value: status } })} /><NativeSelect aria-label={`Status for ${lead.preview[0]?.[1] || lead.formName}`} value={status} disabled={pending} onChange={event => setStatus(event.target.value)}>{LEAD_STATUSES.map(value => <NativeSelectOption key={value} value={value}>{statusLabel(value)}</NativeSelectOption>)}</NativeSelect><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" aria-label="Move enquiry" disabled={pending || status === lead.status}><MoveRight size={17} /></Button></TooltipTrigger><TooltipContent>{"Move enquiry"}</TooltipContent></Tooltip>{state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}</form>;
}
