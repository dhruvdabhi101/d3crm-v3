"use server";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { saveReplyTemplate, removeReplyTemplate } from "@/lib/reply-templates";
import { rateLimit } from "@/lib/rate-limit";
import { RequestError } from "@/lib/request-error";

export type ReplyTemplateState = { error?: string; success?: string; templateId?: string; updatedAt?: string };
function existingVersion(data: FormData) {
  const id = String(data.get("id") ?? "");
  if (!id) return undefined;
  const updatedAt = new Date(String(data.get("updatedAt") ?? ""));
  if (id.length > 100 || isNaN(updatedAt.getTime())) throw new RequestError("Reload the template and try again.", 400);
  return { id, updatedAt };
}

export async function upsertReplyTemplate(_state: ReplyTemplateState, data: FormData): Promise<ReplyTemplateState> {
  const { organization, user } = await requireRole(Role.ADMIN);
  let templateId: string;
  let updatedAt: string;
  try {
    await rateLimit("reply-template", user.id, 120, 3600);
    const template = await db.$transaction(tx => saveReplyTemplate(tx, organization.id, user.id, { name: String(data.get("name") ?? ""), subject: String(data.get("subject") ?? ""), body: String(data.get("body") ?? "") }, existingVersion(data)));
    templateId = template.id;
    updatedAt = template.updatedAt.toISOString();
  } catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath("/templates"); revalidatePath("/submissions/[id]", "page");
  return { success: "Template saved.", templateId, updatedAt };
}

export async function deleteReplyTemplate(data: FormData): Promise<ReplyTemplateState> {
  const { organization, user } = await requireRole(Role.ADMIN);
  try {
    const existing = existingVersion(data);
    if (!existing) return { error: "Choose a template." };
    await rateLimit("reply-template", user.id, 120, 3600);
    await db.$transaction(tx => removeReplyTemplate(tx, organization.id, user.id, existing.id, existing.updatedAt));
  } catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath("/templates"); revalidatePath("/submissions/[id]", "page");
  return { success: "Template removed." };
}
