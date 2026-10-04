"use client";

import { createContext, useContext, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CalendarX2, LoaderCircle, Save } from "lucide-react";
import { updateFollowUp, type FollowUpState } from "@/lib/actions/follow-ups";

const FollowUpAnnouncement = createContext<((message: string) => void) | null>(null);

export function FollowUpFeedback({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState("");
  return <FollowUpAnnouncement.Provider value={setNotice}><p className="follow-up-notice" role="status" aria-atomic="true">{notice}</p>{children}</FollowUpAnnouncement.Provider>;
}

export function FollowUpControls({ id, date, updatedAt }: { id: string; date: string; updatedAt: string }) {
  const announce = useContext(FollowUpAnnouncement);
  const [draftDate, setDraftDate] = useState(date);
  const [loadedVersion, setLoadedVersion] = useState(updatedAt);
  const [dirty, setDirty] = useState(false);
  const [state, setState] = useState<FollowUpState>({});
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    saving.current = true;
    setPending(true);
    setState({});
    try {
      const result = await updateFollowUp(id, {}, data);
      setState(result);
      if (result.success && result.updatedAt) {
        setLoadedVersion(result.updatedAt);
        setDirty(false);
        // The row may disappear after revalidation; announce from the completed request.
        announce?.(result.success);
      }
    } catch {
      setState({ error: "Unable to save this follow-up. Please try again." });
    } finally {
      saving.current = false;
      setPending(false);
    }
  }
  return <form onSubmit={submit} className="follow-up-controls" aria-busy={pending}>
    <input type="hidden" name="updatedAt" value={loadedVersion} />
    <label className="field"><span className="sr-only">Follow-up date (UTC)</span><input name="followUpAt" type="date" value={draftDate} onChange={event => { setDraftDate(event.target.value); setDirty(true); }} disabled={pending} aria-label="Follow-up date (UTC)" /></label>
    <button className="icon-button" type="submit" name="intent" value="save" title="Save follow-up date" aria-label={pending ? "Saving follow-up date" : "Save follow-up date"} disabled={pending}>{pending ? <LoaderCircle size={17} aria-hidden className="loading-icon" /> : <Save size={17} aria-hidden />}</button>
    <button className="icon-button" type="submit" name="intent" value="clear" title="Clear follow-up" aria-label="Clear follow-up" disabled={pending} formNoValidate><CalendarX2 size={17} aria-hidden /></button>
    {state.error && <p className="form-error follow-up-feedback" role="alert">{state.error}</p>}
    {state.success && !announce && !dirty && !pending && <p className="form-success follow-up-feedback" role="status">{state.success}</p>}
  </form>;
}
