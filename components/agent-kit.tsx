"use client";
import { Card } from "@/components/ui/card";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { useState } from "react";
import { Braces, Code2 } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { buildIntegrationPrompt } from "@/lib/forms/agent";
import type { FormSchema } from "@/lib/forms/types";

export function AgentKit({ name, endpoint, schema, formKey, origins }: { name: string; endpoint: string; schema: FormSchema; formKey?: string; origins: string[] }) {
  const [tab, setTab] = useState<"prompt" | "schema">("prompt");
  const prompt = buildIntegrationPrompt({ name, endpoint, schema, key: formKey, origins });
  const value = tab === "prompt" ? prompt : JSON.stringify({ name, schema }, null, 2);
  return <Card className="panel agent-kit"><Tabs value={tab} onValueChange={value => setTab(value as typeof tab)}><div className="panel-header"><div><p className="eyebrow"><Code2 size={13} /> AI handoff</p><h2>Connect with your AI agent</h2><p className="panel-description">Paste this into Codex, Claude, Cursor, or any coding agent to build and connect your form.</p></div></div><div className="agent-toolbar"><TabsList aria-label="Agent handoff format"><TabsTrigger value="prompt"><Code2 size={14} />Integration prompt</TabsTrigger><TabsTrigger value="schema"><Braces size={14} />Form JSON</TabsTrigger></TabsList><CopyButton value={value} label={tab === "prompt" ? "Copy prompt" : "Copy JSON"} /></div><TabsContent value="prompt"><pre className="agent-code" tabIndex={0}>{prompt}</pre></TabsContent><TabsContent value="schema"><pre className="agent-code" tabIndex={0}>{JSON.stringify({ name, schema }, null, 2)}</pre></TabsContent><p className="quiet-note">{formKey ? "Your publishable key is included. Save this prompt before leaving this page." : "The prompt includes your exact fields and endpoint. Your agent will ask for the publishable key."}</p></Tabs></Card>;
}
