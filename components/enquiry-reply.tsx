"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { useConfirm } from "@/components/ui-providers";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Mail, RotateCcw } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { expandReply, REPLY_PRESETS, replyMailto, type ReplyContext } from "@/lib/replies";
import type { SavedReplyTemplate } from "@/components/reply-template-manager";

export function EnquiryReply({ email, templates, context }: { email: string | null; templates: SavedReplyTemplate[]; context: ReplyContext }) {
  const confirm = useConfirm();
  const [selected, setSelected] = useState(templates[0] ? `saved:${templates[0].id}` : "preset:0");
  const initial = expandReply(templates[0] ?? REPLY_PRESETS[0], context);
  const [subject, setSubject] = useState(initial.subject); const [body, setBody] = useState(initial.body);
  const [dirty, setDirty] = useState(false);
  let href = ""; let error = "";
  try { if (email) href = replyMailto(email, subject, body); } catch (issue) { error = issue instanceof Error ? issue.message : "Check the draft fields."; }
  function load(id: string) {
    const content = id.startsWith("saved:") ? templates.find(template => `saved:${template.id}` === id) : REPLY_PRESETS[Number(id.slice(7))];
    if (!content) return;
    const expanded = expandReply(content, context); setSubject(expanded.subject); setBody(expanded.body); setDirty(false);
  }
  return <section className="enquiry-reply" aria-label="Reply draft"><header><h2><Mail size={17} aria-hidden="true" />Reply draft</h2><Link className="text-link" href="/templates">Templates</Link></header>
    {email ? <><Label className="field"><span>To</span><Input type="email" value={email} readOnly autoComplete="off" /></Label><Label className="field"><span>Template</span><NativeSelect aria-label="Template" value={selected} onChange={async event => { const next = event.target.value; if (dirty && !await confirm("Replace your edited draft with this template?")) return; setSelected(next); load(next); }}>
      {templates.length > 0 && <NativeSelectOptGroup label="Workspace">{templates.map(template => <NativeSelectOption key={template.id} value={`saved:${template.id}`}>{template.name}</NativeSelectOption>)}</NativeSelectOptGroup>}<NativeSelectOptGroup label="Starting points">{REPLY_PRESETS.map((preset, index) => <NativeSelectOption key={preset.name} value={`preset:${index}`}>{preset.name}</NativeSelectOption>)}</NativeSelectOptGroup>
    </NativeSelect></Label><Label className="field"><span>Subject</span><Input maxLength={200} value={subject} onChange={event => { setSubject(event.target.value); setDirty(true); }} /></Label><Label className="field"><span>Message</span><Textarea rows={10} maxLength={10000} value={body} onChange={event => { setBody(event.target.value); setDirty(true); }} /></Label>
    {error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}<div className="reply-draft-actions">{href ? <Button asChild variant="default"><a className="button button-primary" href={href}><ExternalLink size={16} aria-hidden="true" />Open email draft</a></Button> : <Button variant="default" type="button" className="button button-primary" disabled><ExternalLink size={16} aria-hidden="true" />Open email draft</Button>}<CopyButton value={`Subject: ${subject}\n\n${body}`} label="Copy message" /><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" type="button" aria-label="Reset draft" disabled={!dirty} onClick={async () => { if (await confirm("Discard your draft changes?")) load(selected); }}><RotateCcw size={17} aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>{"Reset draft"}</TooltipContent></Tooltip></div>
    </> : <p className="quiet-note">No supported email address in this enquiry.</p>}
  </section>;
}
