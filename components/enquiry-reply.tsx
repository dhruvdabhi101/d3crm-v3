"use client";
import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Mail, RotateCcw } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { expandReply, REPLY_PRESETS, replyMailto, type ReplyContext } from "@/lib/replies";
import type { SavedReplyTemplate } from "@/components/reply-template-manager";

export function EnquiryReply({ email, templates, context }: { email: string | null; templates: SavedReplyTemplate[]; context: ReplyContext }) {
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
    {email ? <><label className="field"><span>To</span><input type="email" value={email} readOnly autoComplete="off" /></label><label className="field"><span>Template</span><select value={selected} onChange={event => { if (dirty && !window.confirm("Replace your edited draft with this template?")) return; setSelected(event.target.value); load(event.target.value); }}>
      {templates.length > 0 && <optgroup label="Workspace">{templates.map(template => <option key={template.id} value={`saved:${template.id}`}>{template.name}</option>)}</optgroup>}<optgroup label="Starting points">{REPLY_PRESETS.map((preset, index) => <option key={preset.name} value={`preset:${index}`}>{preset.name}</option>)}</optgroup>
    </select></label><label className="field"><span>Subject</span><input maxLength={200} value={subject} onChange={event => { setSubject(event.target.value); setDirty(true); }} /></label><label className="field"><span>Message</span><textarea rows={10} maxLength={10000} value={body} onChange={event => { setBody(event.target.value); setDirty(true); }} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="reply-draft-actions">{href ? <a className="button button-primary" href={href}><ExternalLink size={16} aria-hidden="true" />Open email draft</a> : <button type="button" className="button button-primary" disabled><ExternalLink size={16} aria-hidden="true" />Open email draft</button>}<CopyButton value={`Subject: ${subject}\n\n${body}`} label="Copy message" /><button className="icon-button" type="button" title="Reset draft" aria-label="Reset draft" disabled={!dirty} onClick={() => { if (window.confirm("Discard your draft changes?")) load(selected); }}><RotateCcw size={17} aria-hidden="true" /></button></div>
    </> : <p className="quiet-note">No supported email address in this enquiry.</p>}
  </section>;
}
