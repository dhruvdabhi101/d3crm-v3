"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, FileInput, Inbox, LayoutDashboard, Plus, Search, X } from "lucide-react";
import type { SearchResult } from "@/lib/workspace-search";

export function WorkspaceSearch({ canAdmin }: { canAdmin: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const show = () => { dialog.current?.showModal(); setOpen(true); input.current?.focus(); };
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close(); else { dialog.current?.showModal(); setOpen(true); input.current?.focus(); }
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);
  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); setLoading(false); setError(""); return; }
    const controller = new AbortController();
    setLoading(true); setResults([]); setError("");
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Search is unavailable. Try again.");
        if (!Array.isArray(data.results)) throw new Error("Search is unavailable. Try again.");
        if (!controller.signal.aborted) setResults(data.results);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Search is unavailable. Try again.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, open]);
  const shortcuts = [
    { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { title: "Inbox", href: "/submissions", icon: Inbox },
    { title: "Follow-ups", href: "/follow-ups", icon: CalendarDays },
    ...(canAdmin ? [{ title: "Create form", href: "/forms/new", icon: Plus }] : []),
  ];
  return <>
    <button className="workspace-search-trigger" onClick={show} aria-label="Search workspace"><Search size={17} /><span className="search-label">Search workspace</span><span className="search-mobile-label" aria-hidden>Search</span></button>
    <dialog ref={dialog} className="search-dialog" aria-labelledby="workspace-search-title" onClose={() => { setOpen(false); setQuery(""); }} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="search-dialog-surface"><h2 id="workspace-search-title" className="sr-only">Search workspace</h2>
        <div className="search-dialog-input"><Search size={20} /><input ref={input} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); dialog.current?.querySelector<HTMLAnchorElement>(".search-results a")?.focus(); } if (event.key === "Enter" && !loading && query.trim().length >= 2 && results[0]) window.location.assign(results[0].href); }} placeholder="Search enquiries and forms…" aria-label="Search enquiries and forms" maxLength={120} autoComplete="off" /><button className="icon-button" onClick={() => dialog.current?.close()} aria-label="Close search" title="Close search"><X size={18} /></button></div>
        <div className="search-results" aria-busy={loading} onKeyDown={event => { if (!["ArrowDown", "ArrowUp"].includes(event.key)) return; const links = [...event.currentTarget.querySelectorAll<HTMLAnchorElement>("a")]; const index = links.indexOf(event.target as HTMLAnchorElement); if (index < 0) return; event.preventDefault(); const next = index + (event.key === "ArrowDown" ? 1 : -1); if (next < 0) input.current?.focus(); else links[Math.min(next, links.length - 1)]?.focus(); }}>
          {query.trim().length < 2 ? <><p className="search-group-label">Go to</p>{shortcuts.map(({ title, href, icon: Icon }) => <a key={href} href={href}><Icon size={18} /><span><strong>{title}</strong></span><ArrowUpRight size={15} /></a>)}</> : <>
            <p className="search-group-label" role="status">{loading ? "Searching…" : error || (results.length ? `${results.length} ${results.length === 1 ? "result" : "results"}` : "No matching enquiries or forms")}</p>
            {results.map(result => <a href={result.href} key={`${result.kind}:${result.id}`}>{result.kind === "form" ? <FileInput size={18} /> : <Inbox size={18} />}<span><strong>{result.title}</strong><small>{result.detail}</small></span><ArrowUpRight size={15} /></a>)}
          </>}
        </div>
      </div>
    </dialog>
  </>;
}
