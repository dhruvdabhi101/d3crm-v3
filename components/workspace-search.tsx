"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";
import { Button } from "@/components/ui/button";

import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, FileInput, Inbox, LayoutDashboard, Plus, Search } from "lucide-react";
import type { SearchResult } from "@/lib/workspace-search";

export function WorkspaceSearch({ canAdmin }: { canAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(current => !current);
        setQuery("");
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
    <Button variant="outline" className="workspace-search-trigger" onClick={() => setOpen(true)} aria-label="Search workspace"><Search size={17} /><span>Search workspace</span><kbd className="search-symbol">⌘ K</kbd></Button>
    <Dialog open={open} onOpenChange={next => { setOpen(next); if (!next) setQuery(""); }}>
      <DialogContent className="search-command p-0" showCloseButton={false}>
        <DialogHeader className="sr-only"><DialogTitle>Search workspace</DialogTitle><DialogDescription>Search enquiries and forms, or jump to a workspace page.</DialogDescription></DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search enquiries and forms…" maxLength={120} aria-label="Search enquiries and forms" />
          <CommandList aria-busy={loading}>
            {query.trim().length < 2 ? <CommandGroup heading="Go to">{shortcuts.map(({ title, href, icon: Icon }) => <CommandItem key={href} value={href} onSelect={() => window.location.assign(href)}><Icon size={18} /><span>{title}</span><ArrowUpRight size={15} className="ml-auto" /></CommandItem>)}</CommandGroup> : <>
              <p className="search-group-label" role="status">{loading ? "Searching…" : error || (results.length ? `${results.length} ${results.length === 1 ? "result" : "results"}` : "No matching enquiries or forms")}</p>
              <CommandGroup>{results.map(result => <CommandItem value={`${result.kind}:${result.id}`} key={`${result.kind}:${result.id}`} onSelect={() => window.location.assign(result.href)}>{result.kind === "form" ? <FileInput size={18} /> : <Inbox size={18} />}<span className="search-result-copy"><strong>{result.title}</strong><small>{result.detail}</small></span><ArrowUpRight size={15} className="ml-auto" /></CommandItem>)}</CommandGroup>
            </>}
          </CommandList>
          <div className="command-hint"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>esc</kbd> Close</span></div>
        </Command>
      </DialogContent>
    </Dialog>
  </>;
}
