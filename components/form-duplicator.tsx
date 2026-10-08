"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
    <Alert className="form-success" role="status"><AlertDescription>Form duplicated. Publishable key, shown once:</AlertDescription></Alert>
    <div className="secret-row"><code>{state.created.key}</code><CopyButton value={state.created.key} /></div>
    <div className="success-actions"><Button asChild variant="default"><a className="button button-primary" href={`/forms/${state.created.id}`}>Open form<ArrowRight size={15} /></a></Button><Button asChild variant="outline"><a className="button button-secondary" href={`/forms/${state.created.id}/connect`}><Plug size={15} />Connect website</a></Button></div>
  </section>;
  return <Accordion type="single" collapsible><AccordionItem value="details" className="form-duplicator">
    <AccordionTrigger><CopyPlus size={15} />Duplicate form</AccordionTrigger><AccordionContent forceMount>
    <form onSubmit={submit} className="form-duplicator-form" aria-busy={pending}>
      <Label className="field"><span>New form name</span><Input name="name" defaultValue={`${name.slice(0, 95)} copy`} required minLength={2} maxLength={100} disabled={!verified || pending} /></Label>
      {!verified && <Alert variant="destructive" className="form-error"><AlertDescription>Verify your email in Settings first.</AlertDescription></Alert>}
      {state.error && <Alert variant="destructive" className="form-error" role="alert"><AlertDescription>{state.error}</AlertDescription></Alert>}
      <Button variant="outline" className="button button-secondary" disabled={!verified || pending}><CopyPlus size={15} />{pending ? "Duplicating..." : "Create draft copy"}</Button>
    </form>
  </AccordionContent></AccordionItem></Accordion>;
}
