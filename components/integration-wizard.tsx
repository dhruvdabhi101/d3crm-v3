"use client";

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
  return <div className="integration-tool"><div className="segmented wizard-tabs" role="group" aria-label="Connection setup">{[{ Icon: KeyRound, label: "Access" }, { Icon: Code2, label: "Code" }, { Icon: Check, label: "Verify" }].map(({ Icon, label }, index) => <button type="button" key={label} aria-pressed={step === index} onClick={() => setStep(index)}><Icon size={15} />{label}</button>)}</div>
    <section className="wizard-content">
      {step === 0 && <><label className="field"><span>Publishable key · {keyPrefix}</span><input type="password" autoComplete="off" value={key} maxLength={128} onChange={event => { setKey(event.target.value); setResult({}); }} /></label><label className="field"><span>Website origin</span><input type="url" value={origin} maxLength={2048} placeholder="https://client.com" onChange={event => { setOrigin(event.target.value); setResult({}); }} /></label><div className="schema-list">{origins.map(value => <code key={value}>{value}</code>)}</div><button className="button button-secondary" type="button" onClick={() => setStep(1)}>Continue</button></>}
      {step === 1 && <><div className="wizard-code-options"><label className="field"><span>Form element ID</span><input value={formId} maxLength={80} onChange={event => setFormId(event.target.value)} /></label><label className="field"><span>Output</span><select value={format} onChange={event => setFormat(event.target.value as typeof format)}><option value="html">HTML + JavaScript</option><option value="javascript">Existing form JavaScript</option></select></label><div className="segmented"><button type="button" aria-pressed={test} onClick={() => setTest(true)}><FlaskConical size={15} />Test</button><button type="button" aria-pressed={!test} onClick={() => setTest(false)}><Play size={15} />Live</button></div></div>{!validId && <p role="alert" className="form-error">Use an element ID starting with a letter, followed by letters, numbers, underscores, or hyphens.</p>}<div className="wizard-copy"><code>{test ? endpoint.replace(/\/submissions$/, "/verify") : endpoint}</code>{validId && <CopyButton value={snippet} label="Copy code" />}</div><pre className="code-block"><code>{snippet}</code></pre><button className="button button-secondary" type="button" onClick={() => setStep(2)}>Continue</button></>}
      {step === 2 && <><dl className="connection-status"><div><dt>Endpoint checked · UTC</dt><dd>{verifiedAt ? new Date(verifiedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "Not checked"}</dd></div><div><dt>Last enquiry received · UTC</dt><dd>{latestAt ? new Date(latestAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) : "No enquiries"}</dd></div></dl><button className="button button-primary" type="button" disabled={pending || !key.trim() || !origin.trim()} onClick={() => startTransition(async () => { try { const reply = await checkConnection(id, key.trim(), origin.trim()); setResult(reply); if (reply.checkedAt) setLastCheck(reply.checkedAt); } catch { setResult({ error: "The check could not complete. Please try again." }); } })}><FlaskConical size={15} />{pending ? "Checking..." : "Run endpoint check"}</button>{result.error && <p role="alert" className="form-error">{result.error}</p>}{result.success && <p role="status" className="form-success">{result.success}</p>}</>}
    </section>
  </div>;
}
