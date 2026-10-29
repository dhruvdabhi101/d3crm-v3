"use client";
import { Check } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { buildIntegrationPrompt } from "@/lib/forms/agent";
import type { FormSchema } from "@/lib/forms/types";

const agentTasks = [
  "Builds the form in your site's own design and framework",
  "Sends each enquiry to this form in d3CRM",
  "Adds spam protection and campaign tracking",
  "Shows clear errors, then tells you how to test it",
];

export function AgentKit({ name, endpoint, schema, formKey, origins }: { name: string; endpoint: string; schema: FormSchema; formKey?: string; origins: string[] }) {
  const prompt = buildIntegrationPrompt({ name, endpoint, schema, key: formKey, origins });
  return <div className="handoff">
    <details className="handoff-copy">
      <summary>What’s in the prompt</summary>
      <ul className="handoff-tasks">{agentTasks.map(task => <li key={task}><Check size={15} aria-hidden="true" />{task}</li>)}</ul>
      <p className="handoff-tools">Use a coding assistant with access to your website project.</p>
    </details>
    <div className="handoff-actions">
      <CopyButton primary value={prompt} label="Copy prompt" />
      <CopyButton value={JSON.stringify({ name, schema }, null, 2)} label="Copy form JSON" />
    </div>
    <p className="handoff-note">{formKey ? "Your key is in the prompt. It's publishable, so it's safe in website code." : "No key added, so your agent will ask you for it before connecting."}</p>
    <details className="prompt-preview">
      <summary>Read the full prompt</summary>
      <pre tabIndex={0}>{prompt}</pre>
    </details>
  </div>;
}
