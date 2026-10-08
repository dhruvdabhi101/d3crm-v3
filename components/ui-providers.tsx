"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";

const ConfirmationContext = createContext<((message: string) => Promise<boolean>) | null>(null);

export function UIProviders({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const focusTarget = useRef<HTMLElement | null>(null);
  const resolve = useRef<((confirmed: boolean) => void) | null>(null);
  function finish(confirmed: boolean) {
    resolve.current?.(confirmed);
    resolve.current = null;
    setMessage("");
  }
  useEffect(() => () => { resolve.current?.(false); }, []);
  function confirm(message: string) {
    focusTarget.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    resolve.current?.(false);
    return new Promise<boolean>(answer => { resolve.current = answer; setMessage(message); });
  }
  return <TooltipProvider><ConfirmationContext.Provider value={confirm}>{children}<AlertDialog open={Boolean(message)} onOpenChange={open => { if (!open) finish(false); }}><AlertDialogContent onCloseAutoFocus={event => { event.preventDefault(); if (focusTarget.current?.isConnected) focusTarget.current.focus(); }}><AlertDialogHeader><AlertDialogTitle>Before you continue</AlertDialogTitle><AlertDialogDescription>{message}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => finish(false)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => finish(true)}>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></ConfirmationContext.Provider></TooltipProvider>;
}

export function useConfirm() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error("useConfirm must be used inside UIProviders");
  return confirm;
}
