"use client";

import { ArrowRight, Check, Code2, MessageSquare, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { createForm, updateForm } from "@/lib/actions/forms";
import { FIELD_TYPES, type FormField, type FormSchema } from "@/lib/forms/types";
import { buildDesignPrompt, parseAgentForm } from "@/lib/forms/agent";
import { CopyButton } from "@/components/copy-button";
import { FormPreview } from "@/components/form-preview";
import { AgentKit } from "@/components/agent-kit";

const initialFields: FormField[] = [
  { id: "name", label: "Full name", type: "text", required: true, maxLength: 120 },
  { id: "email", label: "Email address", type: "email", required: true },
  { id: "message", label: "Message", type: "textarea", required: true, maxLength: 3000 },
];
const templates = [
  { name: "Contact form", icon: MessageSquare, fields: initialFields },
  { name: "Join the waitlist", icon: Users, fields: initialFields.slice(0, 2) },
  { name: "Project inquiry", icon: Code2, fields: [...initialFields.slice(0, 2), { id: "budget", label: "Project budget", type: "select" as const, required: true, options: ["Under $5,000", "$5,000–$15,000", "$15,000+"] }, { ...initialFields[2], label: "Tell us about your project" }] },
];

export function FormBuilder({ baseUrl, initialMode = "manual", initialForm }: { baseUrl: string; initialMode?: "manual" | "ai"; initialForm?: { id: string; name: string; schema: FormSchema; allowedOrigins: string[]; schemaVersion: number } }) {
  const [fields, setFields] = useState<FormField[]>(initialForm?.schema.fields ?? initialFields);
  const [name, setName] = useState(initialForm?.name ?? "");
  const [origins, setOrigins] = useState(initialForm?.allowedOrigins.join("\n") ?? "");
  const [mode, setMode] = useState<"manual" | "ai">(initialMode);
  const [brief, setBrief] = useState("");
  const [json, setJson] = useState("");
  const [importError, setImportError] = useState("");
  const [notice, setNotice] = useState("");
  const [state, action, pending] = useActionState(initialForm ? updateForm.bind(null, initialForm.id) : createForm, {});
  const schema = { version: 1 as const, fields };

  function update(index: number, patch: Partial<FormField>) {
    setFields((current) => current.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field));
  }
  function importForm() {
    try {
      const result = parseAgentForm(json);
      setName(result.name); setFields(result.schema.fields); setImportError(""); setNotice("Form imported. Review your fields and preview, then create your form."); setMode("manual");
    } catch (error) { setImportError(error instanceof SyntaxError ? "That isn’t valid JSON. Paste the complete JSON response from your agent." : error instanceof Error ? error.message : "Unable to import form."); }
  }

  if (state.success && initialForm) return <section className="success-card"><h2>{state.success}</h2><Link className="button button-primary" href={`/forms/${initialForm.id}`}>Open form<ArrowRight size={15} /></Link></section>;
  if (state.created) {
    const endpoint = `${baseUrl}/api/v1/forms/${state.created.slug}/submissions`;
    return <><section className="success-card"><span className="success-icon"><Check size={24} /></span><p className="eyebrow">Ready to connect</p><h2>Your form is ready.</h2><p>Your form is live. Copy the integration prompt below and give it to your coding agent to build the form on your website.</p><div className="secret-row"><code>{state.created.key}</code><CopyButton value={state.created.key} /></div><p className="quiet-note">This publishable key is shown only once. Save it before leaving.</p><div className="success-actions"><Link className="button button-primary" href={`/forms/${state.created.id}`}>Open form <ArrowRight size={15} /></Link><CopyButton value={endpoint} label="Copy endpoint" /></div></section><AgentKit name={state.created.name ?? name} endpoint={endpoint} schema={state.created.schema ?? schema} formKey={state.created.key} origins={state.created.allowedOrigins ?? []} /></>;
  }

  return <div className="builder-workspace"><div className="builder-editor"><div className="builder-modes segmented"><button type="button" aria-pressed={mode === "manual"} onClick={() => setMode("manual")}><Plus size={15} />Form editor</button><button type="button" aria-pressed={mode === "ai"} onClick={() => setMode("ai")}><Code2 size={15} />Build with AI</button></div>
    {mode === "ai" && <section className="panel ai-composer"><span className="ai-icon"><Code2 size={23} strokeWidth={1.5} /></span><h2>Start with an idea.</h2><p>Copy a ready-to-use prompt into your favorite AI. Paste its JSON response here to turn it into a form.</p><label className="field"><span>What would you like to collect?</span><textarea rows={4} value={brief} maxLength={5000} onChange={e => setBrief(e.target.value)} placeholder="A project inquiry form for my design studio. Ask for name, work email, budget, and a short project description…" /></label><div className="prompt-action"><small>Works with any AI · no API key needed</small><CopyButton value={buildDesignPrompt(brief)} label="Copy AI prompt" /></div><div className="import-divider"><span>Then bring it back here</span></div><label className="field"><span>Paste the JSON from your agent</span><textarea className="json-input" rows={5} value={json} maxLength={64000} onChange={e => setJson(e.target.value)} placeholder={'{"name":"Project inquiry","schema":{"version":1,"fields":[…]}}'} /></label>{importError && <p className="form-error" role="alert">{importError}</p>}<button className="button button-primary" type="button" disabled={!json.trim()} onClick={importForm}>Import form <ArrowRight size={15} /></button></section>}
    {notice && <p className="import-notice" role="status"><Check size={16} />{notice}</p>}
    <form action={action} className="builder-layout" hidden={mode === "ai"}>
      <input type="hidden" name="schema" value={JSON.stringify(schema)} />
      {initialForm && <input type="hidden" name="schemaVersion" value={initialForm.schemaVersion} />}
      <section className="panel form-section"><div className="section-heading"><span className="step">1</span><div><h2>Form details</h2><p>Start from a template or create something new.</p></div></div><div className="template-options">{templates.map(({ name: title, icon: Icon, fields: templateFields }) => <button type="button" key={title} onClick={() => { setName(title); setFields(templateFields); }}><Icon size={17} /><span>{title}</span></button>)}</div><label className="field"><span>Form name</span><input name="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website contact form" required minLength={2} maxLength={100} /></label><details className="origin-details"><summary>Website access <span>Optional</span></summary><label className="field"><span>Allowed website origins</span><textarea name="allowedOrigins" value={origins} onChange={e => setOrigins(e.target.value)} rows={2} placeholder={"https://example.com\nhttps://www.example.com"} /><small>One full origin per line. Leave empty to accept any website origin.</small></label></details></section>
      <section className="panel form-section"><div className="section-heading"><span className="step">2</span><div><h2>Fields <span className="count-badge">{fields.length}</span></h2><p>Choose the details you need from your visitors.</p></div></div><div className="field-list">{fields.map((field, index) => <div className="field-row" key={index}><div className="field-row-title"><span className="field-number">{String(index + 1).padStart(2, "0")}</span><strong>{field.label || "Untitled field"}</strong><button className="icon-button danger" type="button" disabled={fields.length === 1} onClick={() => setFields(current => current.filter((_, i) => i !== index))} aria-label={`Remove ${field.label}`}><Trash2 size={15} /></button></div><div className="field-row-grid"><label className="field"><span>Label</span><input value={field.label} required maxLength={80} onChange={e => update(index, { label: e.target.value })} /></label><label className="field"><span>Type</span><select value={field.type} onChange={e => update(index, { type: e.target.value as FormField["type"], options: e.target.value === "select" ? ["Option one"] : undefined })}>{FIELD_TYPES.map(type => <option value={type} key={type}>{type}</option>)}</select></label></div><div className="field-row-bottom"><label className="field-key">Field key <input aria-label={`Key for ${field.label}`} value={field.id} pattern="[a-z][a-z0-9_]*" required maxLength={50} onChange={e => update(index, { id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} /></label><label className="check-field"><input type="checkbox" checked={field.required} onChange={e => update(index, { required: e.target.checked })} /><span>Required</span></label></div>{field.type === "select" && <label className="field"><span>Options <small>comma separated</small></span><input value={field.options?.join(", ") ?? ""} onChange={e => update(index, { options: e.target.value.split(",").map(option => option.trim()) })} /></label>}</div>)}</div><button className="button button-secondary add-field" type="button" disabled={fields.length >= 30} onClick={() => setFields(current => { let i = current.length + 1; while (current.some(field => field.id === `field_${i}`)) i++; return [...current, { id: `field_${i}`, label: "New field", type: "text", required: false, maxLength: 500 }]; })}><Plus size={16} />Add field <small>{fields.length}/30</small></button></section>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}<div className="builder-footer"><p>{initialForm ? "Previous responses keep their original fields." : "Review your form before creating it."}</p><button className="button button-primary" disabled={pending}>{pending ? "Saving…" : initialForm ? "Save changes" : "Create form"}<ArrowRight size={15} /></button></div>
    </form></div><FormPreview name={name} fields={fields} /></div>;
}
