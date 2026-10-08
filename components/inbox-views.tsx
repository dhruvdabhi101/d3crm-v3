"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { useConfirm } from "@/components/ui-providers";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { useRef, useState, type FormEvent } from "react";
import { BookmarkPlus, Save, X } from "lucide-react";
import { createInboxView, deleteInboxView } from "@/lib/actions/inbox";
import { inboxLink, type InboxFilters } from "@/lib/inbox-filters";

export function InboxViews({ views, filters }: { views: { id: string; name: string; filters: InboxFilters }[]; filters: InboxFilters }) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ error?: string; success?: string }>({});
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const data = new FormData(event.currentTarget);
    saving.current = true;
    setPending(true);
    setState({});
    try {
      const result = await createInboxView({}, data);
      setState(result);
      if (result.success) window.location.reload();
    } catch { setState({ error: "Could not save the view. Try again." }); }
    finally { saving.current = false; setPending(false); }
  }
  return <section className="inbox-views" aria-label="Saved inbox views">
    <div className="saved-view-toolbar"><div className="saved-view-list"><span>My views</span>{views.map(view => <div className="saved-view" key={view.id}>
      <a href={inboxLink(view.filters)} aria-current={JSON.stringify(view.filters) === JSON.stringify(filters) ? "page" : undefined}>{view.name}</a>
      <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" aria-label={`Remove ${view.name}`} disabled={removing || pending} onClick={async () => {
        if (!await confirm(`Remove saved view "${view.name}"? Enquiries will not be deleted.`)) return;
        setRemoving(true);
        try { const result = await deleteInboxView(view.id); setRemoveError(result.error ?? ""); if (result.success) window.location.reload(); }
        catch { setRemoveError("Could not remove the view. Try again."); }
        finally { setRemoving(false); }
      }}><X size={14} /></Button></TooltipTrigger><TooltipContent>{`Remove ${view.name}`}</TooltipContent></Tooltip>
    </div>)}</div><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" aria-label="Save current view" aria-expanded={open} disabled={views.length >= 20 || pending || removing} onClick={() => setOpen(!open)}><BookmarkPlus size={18} /></Button></TooltipTrigger><TooltipContent>{"Save current view"}</TooltipContent></Tooltip></div>
    {open && <form className="save-view-form" onSubmit={submit} aria-busy={pending}><input type="hidden" name="filters" value={JSON.stringify(filters)} /><Label className="field"><span>View name</span><Input name="name" required maxLength={60} placeholder="My follow-ups" /></Label><Button variant="outline" className="button button-secondary" disabled={pending}><Save size={16} />{pending ? "Saving..." : "Save view"}</Button>{state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}{state.success && <Alert className="form-success" role="status"><AlertDescription>{state.success}</AlertDescription></Alert>}</form>}
    {removeError && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{removeError}</AlertDescription></Alert>}
  </section>;
}
