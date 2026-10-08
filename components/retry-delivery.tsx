"use client";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";

import { useActionState } from "react";
import { RotateCw } from "lucide-react";
import { retryDelivery } from "@/lib/actions/deliveries";
export function RetryDelivery({ id }: { id: string }) {
  const [state, action, pending] = useActionState(retryDelivery.bind(null, id), {});
  return <form action={action}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" disabled={pending} aria-label="Retry delivery"><RotateCw size={16} /></Button></TooltipTrigger><TooltipContent>{"Retry delivery"}</TooltipContent></Tooltip>{state.error && <small role="alert">{state.error}</small>}{state.success && <small role="status">{state.success}</small>}</form>;
}
