"use client";
import { Button } from "@/components/ui/button";

import { KeyRound } from "lucide-react";
import { useActionState } from "react";
import { CopyButton } from "@/components/copy-button";
import { rotateFormKey } from "@/lib/actions/forms";

export function KeyRotator({ formId }: { formId: string }) {
  const [state, action, pending] = useActionState(rotateFormKey, {});
  if (state.created) return <div className="new-key"><p>Your previous key no longer works. Copy the new key now:</p><div className="secret-row"><code>{state.created.key}</code><CopyButton value={state.created.key} /></div></div>;
  return <form action={action}><input type="hidden" name="id" value={formId} /><Button variant="outline" className="button button-secondary" disabled={pending}><KeyRound size={15} />{pending ? "Rotating…" : "Rotate key"}</Button></form>;
}
