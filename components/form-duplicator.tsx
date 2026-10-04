"use client";

import { ArrowRight, CopyPlus, Plug } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { duplicateForm, type FormActionState } from "@/lib/actions/forms";
import { CopyButton } from "@/components/copy-button";
import { StatusPill } from "@/components/status-pill";

export function FormDuplicator({ id, name, verified }: { id: string; name: string; verified: boolean }) {
  const [state, setState] = useState<FormActionState>({});
  const [pending, setPending] = useState(false);
  const saving = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const data = new FormData(event.currentTarget);
    saving.current = true;
    setPending(true);
    setState({});
    try { setState(await duplicateForm(id, {}, data)); }
    catch { setState({ error: "Could not duplicate the form. Try again." }); }
    finally { saving.current = false; setPending(false); }
  }
  if (state.created) return <section className="form-duplicator-success" aria-label="Duplicated form">
    <div className="header-actions"><h2>{state.created.name}</h2><StatusPill status="DRAFT" /></div>
    <p className="form-success" role="status">Form duplicated. Publishable key, shown once:</p>
    <div className="secret-row"><code>{state.created.key}</code><CopyButton value={state.created.key} /></div>
    <div className="success-actions"><a className="button button-primary" href={`/forms/${state.created.id}`}>Open form<ArrowRight size={15} /></a><a className="button button-secondary" href={`/forms/${state.created.id}/connect`}><Plug size={15} />Connect website</a></div>
  </section>;
  return <details className="form-duplicator">
    <summary><CopyPlus size={15} />Duplicate form</summary>
    <form onSubmit={submit} className="form-duplicator-form" aria-busy={pending}>
      <label className="field"><span>New form name</span><input name="name" defaultValue={`${name.slice(0, 95)} copy`} required minLength={2} maxLength={100} disabled={!verified || pending} /></label>
      {!verified && <p className="form-error">Verify your email in Settings first.</p>}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="button button-secondary" disabled={!verified || pending}><CopyPlus size={15} />{pending ? "Duplicating..." : "Create draft copy"}</button>
    </form>
  </details>;
}
