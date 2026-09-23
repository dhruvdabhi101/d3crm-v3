"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { createForm } from "@/lib/actions/forms";
import { FIELD_TYPES, type FormField } from "@/lib/forms/types";
import { CopyButton } from "@/components/copy-button";

const initialFields: FormField[] = [
  { id: "name", label: "Name", type: "text", required: true, maxLength: 120 },
  { id: "email", label: "Email", type: "email", required: true },
  { id: "message", label: "Message", type: "textarea", required: true, maxLength: 3000 },
];

function nextId(fields: FormField[]) {
  let index = fields.length + 1;
  while (fields.some((field) => field.id === `field_${index}`)) index += 1;
  return `field_${index}`;
}

export function FormBuilder({ baseUrl }: { baseUrl: string }) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [state, action, pending] = useActionState(createForm, {});
  const schema = JSON.stringify({ version: 1, fields });

  function update(index: number, patch: Partial<FormField>) {
    setFields((current) => current.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...patch } : field));
  }

  if (state.created) {
    const endpoint = `${baseUrl}/api/v1/forms/${state.created.slug}/submissions`;
    return <section className="success-card"><span className="success-icon"><Check size={24} /></span><p className="eyebrow">Form created</p><h2>Keep this key somewhere safe.</h2><p>It is shown once. Add it to the <code>X-Form-Key</code> header when your website submits the form.</p><div className="secret-row"><code>{state.created.key}</code><CopyButton value={state.created.key} /></div><div className="success-actions"><Link className="button button-primary" href={`/forms/${state.created.id}`}>Open form</Link><CopyButton value={endpoint} label="Copy endpoint" /></div></section>;
  }

  return (
    <form action={action} className="builder-layout">
      <input type="hidden" name="schema" value={schema} />
      <section className="panel form-section">
        <div className="section-heading"><span className="step">1</span><div><h2>Name and access</h2><p>Choose a clear internal name and limit browser submissions to your sites.</p></div></div>
        <label className="field"><span>Form name</span><input name="name" placeholder="Website contact form" required minLength={2} maxLength={100} /></label>
        <label className="field"><span>Allowed website origins <small>optional</small></span><textarea name="allowedOrigins" rows={3} placeholder={"https://example.com\nhttps://www.example.com"} /><small>One full origin per line. Leave empty to accept browser requests from any origin.</small></label>
      </section>
      <section className="panel form-section">
        <div className="section-heading"><span className="step">2</span><div><h2>Response fields</h2><p>The API rejects undeclared or invalid fields.</p></div></div>
        <div className="field-list">
          {fields.map((field, index) => <div className="field-row" key={`${index}-${field.id}`}>
            <div className="field-row-grid">
              <label className="field"><span>Label</span><input value={field.label} maxLength={80} onChange={(event) => update(index, { label: event.target.value })} /></label>
              <label className="field"><span>Key</span><input value={field.id} pattern="[a-z][a-z0-9_]*" maxLength={50} onChange={(event) => update(index, { id: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} /></label>
              <label className="field"><span>Type</span><select value={field.type} onChange={(event) => update(index, { type: event.target.value as FormField["type"], options: event.target.value === "select" ? ["Option one"] : undefined })}>{FIELD_TYPES.map((type) => <option value={type} key={type}>{type}</option>)}</select></label>
              <label className="check-field"><input type="checkbox" checked={field.required} onChange={(event) => update(index, { required: event.target.checked })} /><span>Required</span></label>
              <button className="icon-button danger" type="button" disabled={fields.length === 1} onClick={() => setFields((current) => current.filter((_, fieldIndex) => fieldIndex !== index))} aria-label={`Remove ${field.label}`}><Trash2 size={16} /></button>
            </div>
            {field.type === "select" && <label className="field"><span>Options <small>comma separated</small></span><input value={field.options?.join(", ") ?? ""} onChange={(event) => update(index, { options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean) })} /></label>}
          </div>)}
        </div>
        <button className="button button-secondary" type="button" onClick={() => setFields((current) => [...current, { id: nextId(current), label: "New field", type: "text", required: false, maxLength: 500 }])}><Plus size={16} />Add field</button>
      </section>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <div className="builder-footer"><p>You can edit status and rotate the key later.</p><button className="button button-primary" disabled={pending}>{pending ? "Creating…" : "Create form"}</button></div>
    </form>
  );
}
