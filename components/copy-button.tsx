"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); } catch { setError(true); return; }
    setError(false);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return <><button className="button button-secondary button-small" type="button" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : label}</button>{error && <span className="copy-error" role="alert">Couldn’t copy. Select and copy the text manually.</span>}</>;
}
