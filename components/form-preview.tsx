
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, LockKeyhole } from "lucide-react";
import type { FormField } from "@/lib/forms/types";

export function FormPreview({ name, fields }: { name: string; fields: FormField[] }) {
  return <aside className="form-preview"><div className="preview-top"><span><i />Live preview</span><span>Desktop</span></div><div className="preview-canvas"><div className="preview-form"><span className="preview-mark"><ArrowRight size={20} /></span><h2>{name || "Let’s start a conversation."}</h2><p>We’d love to hear from you. Fill in the details below.</p><div className="preview-fields">{fields.map((field, index) => <Label className={field.type === "checkbox" ? "check-field" : "field"} key={index}>{field.type === "checkbox" ? <><Checkbox  /><span>{field.label}{field.required && " *"}</span></> : <><span>{field.label}{field.required && <em> *</em>}</span>{field.type === "textarea" ? <Textarea rows={3} placeholder={`Enter ${field.label.toLowerCase()}`} maxLength={field.maxLength} /> : field.type === "select" ? <NativeSelect defaultValue=""><NativeSelectOption value="" disabled>Select an option</NativeSelectOption>{field.options?.map((option, i) => <NativeSelectOption key={i}>{option}</NativeSelectOption>)}</NativeSelect> : <Input type={field.type} placeholder={`Enter ${field.label.toLowerCase()}`} maxLength={field.maxLength} />}</>}</Label>)}</div><Button variant="default" className="button button-primary button-wide" type="button" disabled>Send message <ArrowRight size={15} /></Button><small><LockKeyhole size={11} /> Preview only · no data is sent</small></div></div></aside>;
}
