"use client";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { launchChecklist } from "@/lib/site/tools";

export function FormLaunchChecklist() {
  const [checked, setChecked] = useState<number[]>([]);
  const summary = `d3CRM form launch checklist: ${checked.length}/${launchChecklist.length} checked\n\n${launchChecklist.map((item, index) => `${checked.includes(index) ? "[x]" : "[ ]"} ${item.title}\n    ${item.detail}`).join("\n\n")}`;
  return <Card className="tool-panel" aria-label="Interactive form launch checklist"><p role="status">{checked.length} of {launchChecklist.length} checks complete</p><Progress value={checked.length * 100 / launchChecklist.length} aria-label="Launch checklist progress" aria-valuetext={`${checked.length} of ${launchChecklist.length} checks complete`} /><ul className="launch-checklist">{launchChecklist.map((item, index) => <li key={item.title}><Label><Checkbox  checked={checked.includes(index)} onCheckedChange={isChecked => setChecked((isChecked === true) ? [...checked, index] : checked.filter(value => value !== index))} /><span><strong>{item.title}</strong><span>{item.detail}</span></span></Label></li>)}</ul><div className="hero-actions"><CopyButton value={summary} label="Copy checklist" /><Button variant="outline" type="button" className="button button-secondary" onClick={() => window.print()}>Print checklist</Button><Button variant="outline" type="button" className="button button-secondary" onClick={() => setChecked([])} disabled={!checked.length}>Reset</Button></div><Accordion type="single" collapsible><AccordionItem value="details" className="checklist-text"><AccordionTrigger>View checklist as text</AccordionTrigger><AccordionContent forceMount><pre>{summary}</pre></AccordionContent></AccordionItem></Accordion><p className="tool-hint">Your checkmarks stay on this page and reset when you reload. This checklist records your review; it does not inspect or certify your website.</p></Card>;
}
