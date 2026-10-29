"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Bot, Check, CircleDashed, Code2, FlaskConical, Play, UserRound } from "lucide-react";
import { AgentKit } from "@/components/agent-kit";
import { CopyButton } from "@/components/copy-button";
import { checkConnection } from "@/lib/actions/integration";
import { buildIntegrationPrompt } from "@/lib/forms/agent";
import { fetchExample, websiteSnippet } from "@/lib/forms/integration";
import type { FormSchema } from "@/lib/forms/types";

type Route = "agent" | "snippet" | "developer";

const routes: { value: Route; Icon: typeof Bot; title: string; description: string; tag?: string }[] = [
  { value: "agent", Icon: Bot, title: "Ask your AI coding agent", description: "For a coding assistant with access to your website project.", tag: "Recommended" },
  { value: "snippet", Icon: Code2, title: "Paste a ready-made form", description: "For site builders that support custom HTML and JavaScript." },
  { value: "developer", Icon: UserRound, title: "Send it to a developer", description: "For someone else who manages your website." },
];

const steps = ["Choose how", "Key and website", "Add it to your site", "Check it works"];

function utc(value: string) {
  return `${new Date(value).toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`;
}

export function IntegrationWizard({ id, name, endpoint, schema, origins, keyPrefix, checkedAt, latestAt, initialKey = "" }: { id: string; name: string; endpoint: string; schema: FormSchema; origins: string[]; keyPrefix: string; checkedAt: string | null; latestAt: string | null; initialKey?: string }) {
  const [step, setStep] = useState(0);
  const [route, setRoute] = useState<Route>("agent");
  const [key, setKey] = useState(initialKey);
  const [origin, setOrigin] = useState(origins[0] ?? "");
  const [formId, setFormId] = useState(`d3crm-${id}`);
  const [format, setFormat] = useState<"html" | "javascript">("html");
  const [test, setTest] = useState(true);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [furthest, setFurthest] = useState(0);
  const [pending, startTransition] = useTransition();
  const validId = /^[A-Za-z][A-Za-z0-9_-]{0,79}$/.test(formId);
  const trimmedKey = key.trim();
  const snippet = websiteSnippet({ endpoint, key: trimmedKey || "YOUR_FORM_KEY", name, schema, formId, format, test });
  const verifiedAt = lastCheck ?? checkedAt;
  const chosen = routes.find(item => item.value === route)!;
  const done = [furthest > 0, Boolean(trimmedKey && origin.trim()), furthest > 2, Boolean(verifiedAt || latestAt)];
  const summaries = [chosen.title, trimmedKey ? origin.trim() || "Website not added" : `Key begins ${keyPrefix}`, route === "agent" ? "Prompt" : route === "snippet" ? "Form code" : "Developer brief", latestAt ? "Enquiry received" : verifiedAt ? "Endpoint checked" : "Not checked yet"];

  function go(next: number) {
    setStep(next);
    setFurthest(current => Math.max(current, next));
  }

  const footer = (next?: string) => <div className="guide-footer">
    {step > 0 ? <Button variant="ghost" className="button button-ghost" type="button" onClick={() => go(step - 1)}><ArrowLeft size={15} />Back</Button> : <span />}
    {next && <Button variant="default" className="button button-primary" type="button" onClick={() => go(step + 1)}>Continue<ArrowRight size={15} /></Button>}
  </div>;

  return <section className="setup-guide" aria-label="Website setup guide">
    <ol className="guide-rail">
      {steps.map((title, index) => <li key={title} data-done={done[index] || undefined}>
        <button type="button" aria-label={`Step ${index + 1}: ${title}${done[index] ? ", done" : ""}`} aria-current={step === index ? "step" : undefined} onClick={() => go(index)}>
          <span className="guide-marker" aria-hidden="true">{done[index] && step !== index ? <Check size={13} strokeWidth={2.5} /> : index + 1}</span>
          <span className="guide-label"><strong>{title}</strong><small>{summaries[index]}</small></span>
        </button>
      </li>)}
    </ol>
    <p className="guide-progress" aria-live="polite">Step {step + 1} of {steps.length} · {steps[step]}</p>

    <div className="guide-panel">
      {step === 0 && <>
        <header className="guide-head"><h2>How would you like to add the form?</h2></header>
        <fieldset className="route-options">
          <legend className="sr-only">Setup route</legend>
          {routes.map(({ value, Icon, title, description, tag }) => <label key={value} className="route-option">
            <input type="radio" name="setup-route" value={value} checked={route === value} onChange={() => setRoute(value)} />
            <span className="route-icon" aria-hidden="true"><Icon size={18} /></span>
            <span className="route-text"><strong>{title}{tag && <span className="route-tag">{tag}</span>}</strong><span>{description}</span></span>
            <span className="route-check" aria-hidden="true"><Check size={13} strokeWidth={2.5} /></span>
          </label>)}
        </fieldset>
        {footer("next")}
      </>}

      {step === 1 && <>
        <header className="guide-head"><h2>Add your key and website</h2><p>Use your form key and the address of the website you want to connect.</p></header>
        <div className="guide-fields">
          <Label className="field"><span>Publishable key</span><Input type="password" autoComplete="off" value={key} maxLength={128} placeholder={`${keyPrefix}…`} aria-describedby="key-help" onChange={event => { setKey(event.target.value); setResult({}); }} /><small id="key-help">{initialKey ? "Filled in from the form you just created. Keys are shown only once, so save it somewhere safe." : <>Starts with <code>{keyPrefix}</code>. Keys are only shown when created. Lost it? <Link className="text-link" href={`/forms/${id}#api-key`}>Create a new key</Link>; the old one stops working.</>}</small></Label>
          <Label className="field"><span>Your website address</span><Input type="url" value={origin} maxLength={2048} placeholder="https://yourbusiness.com" aria-describedby="origin-help" onChange={event => { setOrigin(event.target.value); setResult({}); }} /><small id="origin-help">{origins.length ? `This form only accepts: ${origins.join(", ")}.` : "Just the address, with no page path. This form accepts any website for now."}</small></Label>
        </div>
        <p className="guide-aside">You can add the key later.</p>
        {footer("next")}
      </>}

      {step === 2 && <>
        {route === "agent" && <>
          <header className="guide-head"><h2>Hand it to your AI agent</h2><p>Paste the prompt into your website&apos;s coding assistant. Review its changes before publishing.</p></header>
          <AgentKit name={name} endpoint={endpoint} schema={schema} formKey={trimmedKey || undefined} origins={origins} />
        </>}
        {route === "snippet" && <>
          <header className="guide-head"><h2>Paste the form into your site</h2><p>Add a custom code or HTML block where the form should appear, then paste this in. Start in Test mode: it checks the connection without creating an enquiry.</p></header>
          <div className="wizard-code-options">
            <ToggleGroup type="single" value={test ? "test" : "live"} onValueChange={value => { if (value) setTest(value === "test"); }} aria-label="Snippet mode"><ToggleGroupItem value="test"><FlaskConical size={15} />Test</ToggleGroupItem><ToggleGroupItem value="live"><Play size={15} />Live</ToggleGroupItem></ToggleGroup>
            <Label className="field"><span>Output</span><NativeSelect aria-label="Output" value={format} onChange={event => setFormat(event.target.value as typeof format)}><NativeSelectOption value="html">Complete form (HTML)</NativeSelectOption><NativeSelectOption value="javascript">Script for an existing form</NativeSelectOption></NativeSelect></Label>
            <Label className="field"><span>Form element ID</span><Input value={formId} maxLength={80} onChange={event => setFormId(event.target.value)} /></Label>
          </div>
          {!validId && <Alert variant="destructive" role="alert" className="form-error"><AlertDescription>Use an element ID starting with a letter, followed by letters, numbers, underscores, or hyphens.</AlertDescription></Alert>}
          <div className="code-frame">
            <div className="code-frame-bar"><span>{test ? "Test mode · no enquiry is created" : "Live mode · real enquiries"}</span>{validId && <CopyButton primary value={snippet} label="Copy code" />}</div>
            <pre className="code-block"><code>{snippet}</code></pre>
          </div>
          {test && <p className="guide-aside">Once the test message appears on your site, switch to Live, copy the code again, and replace the test version.</p>}
        </>}
        {route === "developer" && <>
          <header className="guide-head"><h2>Send this to your developer</h2><p>Share this brief with your developer.</p></header>
          <div className="handoff-actions"><CopyButton primary value={buildIntegrationPrompt({ name, endpoint, schema, key: trimmedKey || undefined, origins })} label="Copy developer brief" /><CopyButton value={endpoint} label="Copy endpoint" /></div>
          <div className="endpoint-row"><span>POST</span><code>{endpoint}</code></div>
          <dl className="field-contract">{schema.fields.map(field => <div key={field.id}><dt><code>{field.id}</code></dt><dd>{field.type}</dd><dd>{field.required ? "required" : "optional"}</dd></div>)}</dl>
          <details className="prompt-preview"><summary>See a fetch example</summary><pre tabIndex={0}>{fetchExample(endpoint, schema)}</pre></details>
        </>}
        {footer("next")}
      </>}

      {step === 3 && <>
        <header className="guide-head"><h2>Check it works</h2><p>Check the endpoint, then submit your website form to confirm the enquiry reaches your inbox.</p></header>
        <ul className="check-list">
          <li data-ok={Boolean(verifiedAt) || undefined}><span className="check-state" aria-hidden="true">{verifiedAt ? <Check size={14} strokeWidth={2.5} /> : <CircleDashed size={14} />}</span><span><strong>Key and website accepted</strong><small>{verifiedAt ? `Checked ${utc(verifiedAt)}` : "Not checked yet"}</small></span></li>
          <li data-ok={Boolean(latestAt) || undefined}><span className="check-state" aria-hidden="true">{latestAt ? <Check size={14} strokeWidth={2.5} /> : <CircleDashed size={14} />}</span><span><strong>First enquiry received</strong><small>{latestAt ? `Latest ${utc(latestAt)}` : "Waiting for a submission from your site"}</small></span></li>
        </ul>
        <div className="check-run">
          <Button variant="default" className="button button-primary" type="button" disabled={pending || !trimmedKey || !origin.trim()} onClick={() => startTransition(async () => { try { const reply = await checkConnection(id, trimmedKey, origin.trim()); setResult(reply); if (reply.checkedAt) setLastCheck(reply.checkedAt); } catch { setResult({ error: "The check could not complete. Please try again." }); } })}><FlaskConical size={15} />{pending ? "Checking…" : "Run endpoint check"}</Button>
          {(!trimmedKey || !origin.trim()) && <small>Add your key and website address in <button type="button" className="inline-link" onClick={() => go(1)}>step 2</button> to run the check.</small>}
        </div>
        {result.error && <Alert variant="destructive" role="alert" className="form-error"><AlertDescription>{result.error}</AlertDescription></Alert>}
        {result.success && <Alert role="status" className="form-success"><AlertDescription>{result.success}</AlertDescription></Alert>}
        <div className="guide-next"><h3>Once it&apos;s working</h3><ul><li><Link className="text-link" href={`/submissions?form=${id}`}>See enquiries from this form <ArrowRight size={14} /></Link></li><li><Link className="text-link" href={`/forms/${id}#notifications`}>Get an email for each new enquiry <ArrowRight size={14} /></Link></li></ul></div>
        {footer()}
      </>}
    </div>
  </section>;
}
