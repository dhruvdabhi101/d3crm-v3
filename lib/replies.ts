import { z } from "zod";
import { RequestError } from "./request-error.ts";

export const REPLY_VARIABLES = ["name", "form_name", "workspace_name", "sender_name"] as const;
export type ReplyContext = Record<typeof REPLY_VARIABLES[number], string>;
export type ReplyContent = { name: string; subject: string; body: string };

export const REPLY_PRESETS: ReplyContent[] = [
  { name: "Enquiry received", subject: "Your enquiry to {{workspace_name}}", body: "Hi {{name}},\n\nThanks for getting in touch. I've received your enquiry and would love to hear a little more about what you have in mind.\n\nWhat would a good outcome look like for you, and is there a date you're working towards?\n\nBest,\n{{sender_name}}" },
  { name: "Arrange a conversation", subject: "A quick conversation about your enquiry", body: "Hi {{name}},\n\nThanks for sharing the details. Could we set aside a little time to talk through your project?\n\nLet me know a couple of times that suit you, and I'll confirm one.\n\nBest,\n{{sender_name}}" },
  { name: "Check in", subject: "Following up on your enquiry", body: "Hi {{name}},\n\nJust checking in on your enquiry. Are you still looking for help with this?\n\nHappy to answer any questions or pick things up when the timing is right.\n\nBest,\n{{sender_name}}" },
];

function supportedVariables(text: string) {
  return [...text.matchAll(/{{([^{}]*)}}/g)].every(match => REPLY_VARIABLES.includes(match[1].trim() as typeof REPLY_VARIABLES[number]));
}

export function replyInput(input: unknown): ReplyContent {
  const schema = z.object({
    name: z.string().trim().min(1).max(60).refine(value => !/[\x00-\x1f\x7f]/.test(value)),
    subject: z.string().trim().min(1).max(200).refine(value => !/[\x00-\x1f\x7f]/.test(value)),
    body: z.string().trim().min(1).max(5000).refine(value => !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)),
  });
  const result = schema.safeParse(input);
  if (!result.success) throw new RequestError("Use a name up to 60 characters, a one-line subject up to 200, and a message up to 5,000.", 400);
  if (!supportedVariables(result.data.subject) || !supportedVariables(result.data.body)) throw new RequestError("Use only name, form_name, workspace_name, or sender_name as template variables.", 400);
  return result.data;
}

function singleLine(value: string) { return value.replace(/[\x00-\x1f\x7f]/g, " ").trim().slice(0, 200); }

export function replyContext(data: unknown, formName: string, workspaceName: string, senderName: string): ReplyContext {
  const answers = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const name = ["name", "full_name", "first_name"].map(key => answers[key]).find(value => typeof value === "string" && value.trim()) as string | undefined;
  return { name: name ? singleLine(name) : "there", form_name: singleLine(formName), workspace_name: singleLine(workspaceName), sender_name: singleLine(senderName) };
}

export function expandReply(content: Pick<ReplyContent, "subject" | "body">, context: ReplyContext) {
  const expand = (value: string) => value.replace(/{{\s*(name|form_name|workspace_name|sender_name)\s*}}/g, (_match, variable: keyof ReplyContext) => singleLine(context[variable]));
  return { subject: singleLine(expand(content.subject)), body: expand(content.body) };
}

export function replyMailto(email: string, subject: string, body: string) {
  const recipient = z.string().email().max(254).safeParse(email);
  if (!recipient.success || /[,;\r\n]/.test(email)) throw new RequestError("This enquiry does not have a supported single email address.", 400);
  if (!subject.trim() || subject.length > 200 || /[\x00-\x1f\x7f]/.test(subject)) throw new RequestError("Use a one-line subject up to 200 characters.", 400);
  if (!body.trim() || body.length > 10000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(body)) throw new RequestError("Use a message up to 10,000 characters.", 400);
  const lines = body.replace(/\r\n|\r/g, "\n").replace(/\n/g, "\r\n");
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
}
