"use client";
import { useActionState } from "react";
import { RotateCw } from "lucide-react";
import { retryDelivery } from "@/lib/actions/deliveries";
export function RetryDelivery({ id }: { id: string }) {
  const [state, action, pending] = useActionState(retryDelivery.bind(null, id), {});
  return <form action={action}><button className="icon-button" disabled={pending} title="Retry delivery" aria-label="Retry delivery"><RotateCw size={16} /></button>{state.error && <small role="alert">{state.error}</small>}{state.success && <small role="status">{state.success}</small>}</form>;
}
