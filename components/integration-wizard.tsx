"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { useState, useTransition } from "react";
import { Check, Code2, FlaskConical, KeyRound, Play } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { checkConnection } from "@/lib/actions/integration";
import { websiteSnippet } from "@/lib/forms/integration";
import type { FormSchema } from "@/lib/forms/types";

export function IntegrationWizard({ id, name, endpoint, schema, origins, keyPrefix, checkedAt, latestAt, initialKey = "" }: { id: string; name: string; endpoint: string; schema: FormSchema; origins: string[]; keyPrefix: string; checkedAt: string | null; latestAt: string | null; initialKey?: string }) {
  const [step, setStep] = useState(0);
  const [key, setKey] = useState(initialKey);
  const [origin, setOrigin] = useState(origins[0] ?? "");
  const [formId, setFormId] = useState(`d3crm-${id}`);
  const [format, setFormat] = useState<"html" | "javascript">("html");
  const [test, setTest] = useState(true);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();
  const validId = /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(formId);
  const snippet = websiteSnippet({ endpoint, key: key.trim() || "YOUR_FORM_KEY", name, schema, formId, format, test });
  const verifiedAt = lastCheck ?? checkedAt;
  return <Tabs className="integration-tool" value={String(step)} onValueChange={value => setStep(Number(value))}><TabsList className="wizard-tabs" aria-label="Connection setup">{[{ Icon: KeyRound, label: "Access" }, { Icon: Code2, label: "Code" }, { Icon: Check, label: "Verify" }].map(({ Icon, label }, index) => <TabsTrigger key={label} value={String(index)}><Icon size={15} />{label}</TabsTrigger>)}</TabsList>
    <section className="wizard-content">
      <TabsContent value="0"><Label className="field"><span>Publishable key · {keyPrefix}</span><Input type="password" autoComplete="off" value={key} maxLength={128} onChange={event => { setKey(event.target.value); setResult({}); }} /></Label><Label className="field"><span>Website origin</span><Input type="url" value={origin} maxLength={2048} placeholder="https://client.com" onChange={event => { setOrigin(event.target.value); setResult({}); }} /></Label><div className="schema-list">{origins.map(value => <code key={value}>{value}</code>)}</div><Button variant="outline" className="button button-secondary" type="button" onClick={() => setStep(1)}>Continue</Button></TabsContent>
      <TabsContent value="1"><div className="wizard-code-options"><Label className="field"><span>Form element ID</span><Input value={formId} maxLength={80} onChange={event => setFormId(event.target.value)} /></Label><Label className="field"><span>Output</span><NativeSelect aria-label="Output" value={format} onChange={event => setFormat(event.target.value as typeof format)}><NativeSelectOption value="html">HTML + JavaScript</NativeSelectOption><NativeSelectOption value="javascript">Existing form JavaScript</NativeSelectOption></NativeSelect></Label><ToggleGroup type="single" value={test ? "test" : "live"} onValueChange={value => { if (value) setTest(value === "test"); }} aria-label="Snippet mode"><ToggleGroupItem value="test"><FlaskConical size={15} />Test</ToggleGroupItem><ToggleGroupItem value="live"><Play size={15} />Live</ToggleGroupItem></ToggleGroup></div>{!validId && <Alert variant="destructive" role="alert" className="form-error"><AlertDescription>Use an element ID starting with a letter, followed by letters, numbers, underscores, or hyphens.</AlertDescription></Alert>}<div className="wizard-copy"><code>{test ? endpoint.replace(/\/submissions$/, "/verify") : endpoint}</code>{validId && <CopyButton value={snippet} label="Copy code" />}</div><pre className="code-block"><code>{snippet}</code></pre><Button variant="outline" className="button button-secondary" type="button" onClick={() => setStep(2)}>Continue</Button></TabsContent>
      <TabsContent value="2"><dl className="connection-status"><div><dt>Endpoint checked · UTC</dt><dd>{verifiedAt ? new Date(verifiedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "Not checked"}</dd></div><div><dt>Last enquiry received · UTC</dt><dd>{latestAt ? new Date(latestAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "No enquiries"}</dd></div></dl><Button variant="default" className="button button-primary" type="button" disabled={pending || !key.trim() || !origin.trim()} onClick={() => startTransition(async () => { try { const reply = await checkConnection(id, key.trim(), origin.trim()); setResult(reply); if (reply.checkedAt) setLastCheck(reply.checkedAt); } catch { setResult({ error: "The check could not complete. Please try again." }); } })}><FlaskConical size={15} />{pending ? "Checking..." : "Run endpoint check"}</Button>{result.error && <Alert variant="destructive" role="alert" className="form-error"><AlertDescription>{result.error}</AlertDescription></Alert>}{result.success && <Alert role="status" className="form-success"><AlertDescription>{result.success}</AlertDescription></Alert>}</TabsContent>
    </section>
  </Tabs>;
}
