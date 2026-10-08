"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { useConfirm } from "@/components/ui-providers";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useCallback, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { deleteReplyTemplate, upsertReplyTemplate, type ReplyTemplateState } from "@/lib/actions/reply-templates";
import { REPLY_PRESETS, REPLY_VARIABLES } from "@/lib/replies";

export type SavedReplyTemplate = { id: string; name: string; subject: string; body: string; updatedAt: string };

function TemplateEditor({ template, onSaved, onDirtyChange, onPendingChange, disabled }: { template?: SavedReplyTemplate; onSaved: (id: string) => void; onDirtyChange: (dirty: boolean) => void; onPendingChange: (pending: boolean) => void; disabled: boolean }) {
  const confirm = useConfirm();
  const [state, setState] = useState<ReplyTemplateState>({});
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const [name, setName] = useState(template?.name ?? "");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [loadedVersion, setLoadedVersion] = useState(template?.updatedAt ?? "");
  const [preset, setPreset] = useState("");
  const [variable, setVariable] = useState<string>(REPLY_VARIABLES[0]);
  const [target, setTarget] = useState<"subject" | "body">("body");
  const [insertError, setInsertError] = useState("");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const data = new FormData(event.currentTarget);
    saving.current = true;
    setPending(true);
    onPendingChange(true);
    setState({});
    try {
      const result = await upsertReplyTemplate({}, data);
      setState(result);
      if (result.success && result.templateId && result.updatedAt) {
        setLoadedVersion(result.updatedAt);
        onDirtyChange(false);
        onSaved(result.templateId);
      }
    } catch {
      setState({ error: "Could not save the template. Try again." });
    } finally {
      saving.current = false;
      setPending(false);
      onPendingChange(false);
    }
  }
  function insertVariable() {
    const element = target === "subject" ? subjectRef.current : bodyRef.current;
    const current = target === "subject" ? subject : body;
    const start = element?.selectionStart ?? current.length; const end = element?.selectionEnd ?? start;
    const token = `{{${variable}}}`;
    const next = current.slice(0, start) + token + current.slice(end);
    if (next.length > (target === "subject" ? 200 : 5000)) { setInsertError("This field has reached its character limit."); return; }
    setInsertError("");
    onDirtyChange(true);
    if (target === "subject") setSubject(next); else setBody(next);
    requestAnimationFrame(() => { element?.focus(); element?.setSelectionRange(start + token.length, start + token.length); });
  }
  return <form onSubmit={submit} className="reply-template-editor" aria-busy={pending}><input type="hidden" name="id" value={template?.id ?? ""} /><input type="hidden" name="updatedAt" value={loadedVersion} /><fieldset disabled={pending || disabled}>
    {!template && <Label className="field"><span>Starting point</span><NativeSelect aria-label="Starting point" value={preset} onChange={async event => { const index = event.target.value; if ((name || subject || body) && !await confirm("Replace your unsaved template with this starting point?")) return; setPreset(index); const content = index === "" ? { name: "", subject: "", body: "" } : REPLY_PRESETS[Number(index)]; if (content) { setName(content.name); setSubject(content.subject); setBody(content.body); onDirtyChange(true); } }}><NativeSelectOption value="">Blank template</NativeSelectOption>{REPLY_PRESETS.map((content, index) => <NativeSelectOption key={content.name} value={index}>{content.name}</NativeSelectOption>)}</NativeSelect></Label>}
    <Label className="field"><span>Name</span><Input name="name" required maxLength={60} value={name} onChange={event => { setName(event.target.value); onDirtyChange(true); }} /></Label>
    <Label className="field"><span>Subject</span><Input ref={subjectRef} name="subject" required maxLength={200} value={subject} onFocus={() => setTarget("subject")} onChange={event => { setSubject(event.target.value); onDirtyChange(true); }} /></Label>
    <div className="reply-variable-tools"><Label className="field"><span>Variable</span><NativeSelect aria-label="Template variable" value={variable} onChange={event => setVariable(event.target.value)}>{REPLY_VARIABLES.map(value => <NativeSelectOption key={value} value={value}>{`{{${value}}}`}</NativeSelectOption>)}</NativeSelect></Label><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" type="button" aria-label={`Insert variable into ${target}`} onClick={insertVariable}><Plus size={18} aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>{`Insert variable into ${target}`}</TooltipContent></Tooltip></div>
    <Label className="field"><span>Message</span><Textarea ref={bodyRef} name="body" required rows={12} maxLength={5000} value={body} onFocus={() => setTarget("body")} onChange={event => { setBody(event.target.value); onDirtyChange(true); }} /></Label>
    <Button variant="default" className="button button-primary"><Save size={16} aria-hidden="true" /><span className="button-label"><span aria-hidden="true" className="button-label-size">Save template</span><span>{pending ? "Saving..." : "Save template"}</span></span></Button>
  </fieldset>{insertError && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{insertError}</AlertDescription></Alert>}{state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}</form>;
}

export function ReplyTemplateManager({ templates, canAdmin }: { templates: SavedReplyTemplate[]; canAdmin: boolean }) {
  const confirm = useConfirm();
  const router = useRouter();
  const [activeId, setActiveId] = useState(templates[0]?.id ?? "");
  const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  const [removing, startRemoving] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [editingPending, setEditingPending] = useState(false);
  const selected = templates.find(template => template.id === activeId);
  const saved = useCallback((id: string) => { setActiveId(id); setNotice("Template saved."); setError(""); router.refresh(); }, [router]);
  async function choose(id: string) {
    if (id === activeId || editingPending || removing) return;
    if (dirty && !await confirm("Discard your unsaved template changes?")) return;
    setActiveId(id); setDirty(false); setNotice(""); setError("");
  }
  async function remove() {
    if (!selected || !await confirm(`Remove template "${selected.name}"? Existing enquiries will not change.`)) return;
    const data = new FormData(); data.set("id", selected.id); data.set("updatedAt", selected.updatedAt);
    startRemoving(async () => {
      try {
        const result = await deleteReplyTemplate(data);
        if (result.error) { setError(result.error); return; }
        setActiveId(""); setDirty(false); setNotice("Template removed."); setError("");
        router.refresh();
      } catch { setError("Could not remove the template. Try again."); }
    });
  }
  return <section className="reply-template-workspace">
    <aside className="reply-template-list" aria-label="Reply templates"><header><span>{templates.length} / 30</span>{canAdmin && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" type="button" aria-label="New reply template"  disabled={templates.length >= 30 || editingPending || removing} onClick={() => choose("")}><Plus size={18} aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>{templates.length >= 30 ? "Template limit reached" : "New reply template"}</TooltipContent></Tooltip>}</header>{templates.map(template => <Button variant="ghost" type="button" className="reply-template-item" key={template.id} aria-pressed={selected?.id === template.id} disabled={editingPending || removing} onClick={() => choose(template.id)}><strong>{template.name}</strong><span>{template.subject}</span></Button>)}{!templates.length && <p className="quiet-note">No saved templates.</p>}</aside>
    <div className="reply-template-detail" aria-busy={removing}><header><h2>{selected?.name ?? (canAdmin ? "New template" : "Reply templates")}</h2>{canAdmin && selected && <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" type="button" className="icon-button danger" aria-label={removing ? "Removing template" : "Delete template"} disabled={removing || editingPending} onClick={remove}><Trash2 size={18} aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>{removing ? "Removing template" : "Delete template"}</TooltipContent></Tooltip>}</header>{notice && !dirty && !removing && <Alert className="form-success" role="status"><AlertDescription>{notice}</AlertDescription></Alert>}{removing && <p className="quiet-note" role="status">Removing template...</p>}{error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
      {canAdmin ? <TemplateEditor key={selected?.id ?? "new"} template={selected} onSaved={saved} onDirtyChange={setDirty} onPendingChange={setEditingPending} disabled={removing} /> : selected ? <><dl className="response-details"><div><dt>Subject</dt><dd>{selected.subject}</dd></div><div><dt>Message</dt><dd>{selected.body}</dd></div></dl></> : <p className="quiet-note">No saved templates.</p>}
    </div>
  </section>;
}
