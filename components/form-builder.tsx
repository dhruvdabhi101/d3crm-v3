"use client";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";

import { ArrowRight, Check, Code2, MessageSquare, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { createForm, updateForm } from "@/lib/actions/forms";
import { FIELD_TYPES, type FormField, type FormSchema } from "@/lib/forms/types";
import { buildDesignPrompt, parseAgentForm } from "@/lib/forms/agent";
import { CopyButton } from "@/components/copy-button";
import { FormPreview } from "@/components/form-preview";
import { AgentKit } from "@/components/agent-kit";
import { IntegrationWizard } from "@/components/integration-wizard";

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

  if (state.success && initialForm) return <Card className="success-card"><h2>{state.success}</h2><Button asChild variant="default"><Link className="button button-primary" href={`/forms/${initialForm.id}`}>Open form<ArrowRight size={15} /></Link></Button></Card>;
  if (state.created) {
    const endpoint = `${baseUrl}/api/v1/forms/${state.created.slug}/submissions`;
    return <><Card className="success-card"><span className="success-icon"><Check size={24} /></span><p className="eyebrow">Ready to connect</p><h2>Your form is ready.</h2><p>Your form is live. Copy the integration prompt below and give it to your coding agent to build the form on your website.</p><div className="secret-row"><code>{state.created.key}</code><CopyButton value={state.created.key} /></div><p className="quiet-note">This publishable key is shown only once. Save it before leaving.</p><div className="success-actions"><Button asChild variant="default"><Link className="button button-primary" href={`/forms/${state.created.id}`}>Open form <ArrowRight size={15} /></Link></Button><CopyButton value={endpoint} label="Copy endpoint" /></div></Card><IntegrationWizard id={state.created.id} name={state.created.name ?? name} endpoint={endpoint} schema={state.created.schema ?? schema} initialKey={state.created.key} keyPrefix={state.created.key.slice(0, 12)} origins={state.created.allowedOrigins ?? []} checkedAt={null} latestAt={null} /><AgentKit name={state.created.name ?? name} endpoint={endpoint} schema={state.created.schema ?? schema} formKey={state.created.key} origins={state.created.allowedOrigins ?? []} /></>;
  }

  return <div className="builder-workspace"><Tabs className="builder-editor" value={mode} onValueChange={value => setMode(value as typeof mode)}><TabsList className="builder-modes" aria-label="Form creation method"><TabsTrigger value="manual"><Plus size={15} />Form editor</TabsTrigger><TabsTrigger value="ai"><Code2 size={15} />Build with AI</TabsTrigger></TabsList>
    <TabsContent value="ai"><Card className="panel ai-composer"><span className="ai-icon"><Code2 size={23} strokeWidth={1.5} /></span><h2>Start with an idea.</h2><p>Copy a ready-to-use prompt into your favorite AI. Paste its JSON response here to turn it into a form.</p><Label className="field"><span>What would you like to collect?</span><Textarea rows={4} value={brief} maxLength={5000} onChange={e => setBrief(e.target.value)} placeholder="A project inquiry form for my design studio. Ask for name, work email, budget, and a short project description…" /></Label><div className="prompt-action"><small>Works with any AI · no API key needed</small><CopyButton value={buildDesignPrompt(brief)} label="Copy AI prompt" /></div><div className="import-divider"><span>Then bring it back here</span></div><Label className="field"><span>Paste the JSON from your agent</span><Textarea className="json-input" rows={5} value={json} maxLength={64000} onChange={e => setJson(e.target.value)} placeholder={'{"name":"Project inquiry","schema":{"version":1,"fields":[…]}}'} /></Label>{importError && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{importError}</AlertDescription></Alert>}<Button variant="default" className="button button-primary" type="button" disabled={!json.trim()} onClick={importForm}>Import form <ArrowRight size={15} /></Button></Card></TabsContent>
    {notice && <Alert className="import-notice" role="status"><AlertDescription><Check size={16} />{notice}</AlertDescription></Alert>}
    <TabsContent value="manual" forceMount hidden={mode === "ai"}><form action={action} className="builder-layout">
      <input type="hidden" name="schema" value={JSON.stringify(schema)} />
      {initialForm && <input type="hidden" name="schemaVersion" value={initialForm.schemaVersion} />}
      <Card className="panel form-section"><div className="section-heading"><span className="step">1</span><div><h2>Form details</h2><p>Start from a template or create something new.</p></div></div><div className="template-options">{templates.map(({ name: title, icon: Icon, fields: templateFields }) => <Button variant="ghost" type="button" key={title} onClick={() => { setName(title); setFields(templateFields); }}><Icon size={17} /><span>{title}</span></Button>)}</div><Label className="field"><span>Form name</span><Input name="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website contact form" required minLength={2} maxLength={100} /></Label><Accordion type="single" collapsible><AccordionItem value="details" className="origin-details"><AccordionTrigger>Website access <span>Optional</span></AccordionTrigger><AccordionContent forceMount><Label className="field"><span>Allowed website origins</span><Textarea name="allowedOrigins" value={origins} onChange={e => setOrigins(e.target.value)} rows={2} placeholder={"https://example.com\nhttps://www.example.com"} /><small>One full origin per line. Leave empty to accept any website origin.</small></Label></AccordionContent></AccordionItem></Accordion></Card>
      <Card className="panel form-section"><div className="section-heading"><span className="step">2</span><div><h2>Fields <Badge variant="secondary" className="count-badge">{fields.length}</Badge></h2><p>Choose the details you need from your visitors.</p></div></div><div className="field-list">{fields.map((field, index) => <div className="field-row" key={index}><div className="field-row-title"><span className="field-number">{String(index + 1).padStart(2, "0")}</span><strong>{field.label || "Untitled field"}</strong><Button variant="ghost" size="icon" className="icon-button danger" type="button" disabled={fields.length === 1} onClick={() => setFields(current => current.filter((_, i) => i !== index))} aria-label={`Remove ${field.label}`}><Trash2 size={15} /></Button></div><div className="field-row-grid"><Label className="field"><span>Label</span><Input value={field.label} required maxLength={80} onChange={e => update(index, { label: e.target.value })} /></Label><Label className="field"><span>Type</span><NativeSelect aria-label="Type" value={field.type} onChange={e => update(index, { type: e.target.value as FormField["type"], options: e.target.value === "select" ? ["Option one"] : undefined })}>{FIELD_TYPES.map(type => <NativeSelectOption value={type} key={type}>{type}</NativeSelectOption>)}</NativeSelect></Label></div><div className="field-row-bottom"><Label className="field-key">Field key <Input aria-label={`Key for ${field.label}`} value={field.id} pattern="[a-z][a-z0-9_]*" required maxLength={50} onChange={e => update(index, { id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} /></Label><Label className="check-field"><Checkbox  checked={field.required} onCheckedChange={checked => update(index, { required: (checked === true) })} /><span>Required</span></Label></div>{field.type === "select" && <Label className="field"><span>Options <small>comma separated</small></span><Input value={field.options?.join(", ") ?? ""} onChange={e => update(index, { options: e.target.value.split(",").map(option => option.trim()) })} /></Label>}</div>)}</div><Button variant="outline" className="button button-secondary add-field" type="button" disabled={fields.length >= 30} onClick={() => setFields(current => { let i = current.length + 1; while (current.some(field => field.id === `field_${i}`)) i++; return [...current, { id: `field_${i}`, label: "New field", type: "text", required: false, maxLength: 500 }]; })}><Plus size={16} />Add field <small>{fields.length}/30</small></Button></Card>
      {state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}<div className="builder-footer"><p>{initialForm ? "Previous responses keep their original fields." : "Review your form before creating it."}</p><Button variant="default" className="button button-primary" disabled={pending}>{pending ? "Saving…" : initialForm ? "Save changes" : "Create form"}<ArrowRight size={15} /></Button></div>
    </form></TabsContent></Tabs><FormPreview name={name} fields={fields} /></div>;
}
