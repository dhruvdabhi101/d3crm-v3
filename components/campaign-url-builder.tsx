"use client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { campaignFields, campaignUrl, type CampaignInput } from "@/lib/site/tools";

const labels = { utm_source: "Source", utm_medium: "Medium", utm_campaign: "Campaign name", utm_term: "Term (optional)", utm_content: "Content (optional)" };
const examples = { utm_source: "newsletter", utm_medium: "email", utm_campaign: "autumn-launch", utm_term: "", utm_content: "header-link" };

export function CampaignUrlBuilder() {
  const [url, setUrl] = useState("");
  const [campaign, setCampaign] = useState<CampaignInput>({ utm_source: "", utm_medium: "", utm_campaign: "", utm_term: "", utm_content: "" });
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  function clearResult() { setResult(""); setError(""); }
  return <form className="tool-panel" onSubmit={event => { event.preventDefault(); try { setResult(campaignUrl(url, campaign)); setError(""); } catch (error) { setResult(""); setError(error instanceof Error ? error.message : "Check the values and try again."); } }}>
    <Label className="field"><span>Website URL</span><Input type="url" required maxLength={2048} placeholder="https://example.com/contact" value={url} onChange={event => { setUrl(event.target.value); clearResult(); }} /></Label>
    <div className="tool-fields">{campaignFields.map(key => <Label className="field" key={key}><span>{labels[key]}</span><Input required={!['utm_term', 'utm_content'].includes(key)} maxLength={200} value={campaign[key]} placeholder={examples[key]} onChange={event => { setCampaign({ ...campaign, [key]: event.target.value }); clearResult(); }} /></Label>)}</div>
    <p className="tool-hint">Source and medium are lowercased. Existing UTM values are replaced; other query parameters and fragments are preserved. Keep personal information out of campaign values.</p>
    <Button variant="default" className="button button-primary" type="submit">Build campaign URL</Button>
    {error && <p className="copy-error" role="alert">{error}</p>}
    {result && <div className="tool-result"><Label className="field"><span>Campaign URL</span><Textarea rows={4} readOnly value={result} /></Label><CopyButton value={result} label="Copy campaign URL" /><p role="status">Your campaign URL is ready.</p></div>}
  </form>;
}
