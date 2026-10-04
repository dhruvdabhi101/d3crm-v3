"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copying = useRef(false);
  useEffect(() => () => { if (reset.current) clearTimeout(reset.current); }, []);
  async function copy() {
    if (copying.current) return;
    copying.current = true;
    setPending(true); setError(false); setCopied(false);
    if (reset.current) clearTimeout(reset.current);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      reset.current = setTimeout(() => setCopied(false), 1600);
    } catch { setError(true); }
    finally { copying.current = false; setPending(false); }
  }
  return <><button className="button button-secondary button-small copy-button" type="button" onClick={copy} disabled={pending} aria-busy={pending}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}<span className="button-label"><span aria-hidden="true" className="button-label-size">{label}</span><span aria-hidden="true" className="button-label-size">Copied</span><span aria-live="polite">{copied ? "Copied" : label}</span></span></button>{error && <span className="copy-error" role="alert">Could not copy. Select and copy the text manually.</span>}</>;
}
