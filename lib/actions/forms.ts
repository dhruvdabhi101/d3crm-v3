"use server";

import { FormStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type { FormSchema } from "@/lib/forms/types";
import { parseFormSchema } from "@/lib/forms/validate";
import { createFormKey } from "@/lib/keys";
import { requireRole } from "@/lib/permissions";
import { toSlug } from "@/lib/slug";
import { encrypt, randomToken, webhookUrl, RequestError } from "@/lib/security";
import { mailConfigured } from "@/lib/deliveries";
import { checkQuota } from "@/lib/billing";
import { rateLimit } from "@/lib/rate-limit";
import { routingInput, saveRouting } from "@/lib/assignment";
import { duplicateFormInWorkspace } from "@/lib/forms/duplicate";

export type FormActionState = { error?: string; success?: string; created?: { id: string; slug: string; key: string; name?: string; schema?: FormSchema; allowedOrigins?: string[] } };

export async function duplicateForm(id: string, _state: FormActionState, formData: FormData): Promise<FormActionState> {
  const { organization, user } = await requireRole(Role.ADMIN);
  if (!user.emailVerifiedAt) return { error: "Verify your email in Settings before duplicating forms." };
  let created;
  try {
    await rateLimit("create-form", user.id, 50, 86400);
    created = await db.$transaction(tx => duplicateFormInWorkspace(tx, organization.id, user.id, id, String(formData.get("name") ?? "")));
  } catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath("/forms"); revalidatePath("/activity");
  return { created };
}

export async function updateRouting(id: string, _state: FormActionState, formData: FormData): Promise<FormActionState> {
  const { organization, user } = await requireRole(Role.ADMIN);
  if (!user.emailVerifiedAt) return { error: "Verify your email in Settings first." };
  try {
    const input = routingInput(formData);
    const updatedAt = new Date(String(formData.get("updatedAt") ?? ""));
    if (isNaN(updatedAt.getTime())) return { error: "Reload the form before saving." };
    await db.$transaction(tx => saveRouting(tx, organization.id, user.id, id, updatedAt, input));
  } catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath(`/forms/${id}`); revalidatePath("/activity");
  return { success: "Routing saved." };
}

function formInput(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 100) throw new Error("Use a form name between 2 and 100 characters.");
  const schema = parseFormSchema(JSON.parse(String(formData.get("schema") ?? "")));
  const values = String(formData.get("allowedOrigins") ?? "").split(/[\n,]/).map(value => value.trim().replace(/\/$/, "")).filter(Boolean);
  if (values.length > 50) throw new Error("Use at most 50 allowed origins.");
  const allowedOrigins = values.map(origin => {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) throw new Error("Use full origins without paths, such as https://example.com.");
    return url.origin;
  });
  return { name, schema, allowedOrigins: [...new Set(allowedOrigins)] };
}

export async function updateForm(id: string, _state: FormActionState, formData: FormData): Promise<FormActionState> {
  const { organization, user } = await requireRole(Role.ADMIN);
  let input;
  try { input = formInput(formData); } catch (error) { return { error: error instanceof Error ? error.message : "Check your form." }; }
  const schemaVersion = Number(formData.get("schemaVersion"));
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) return { error: "Reload the form and try again." };
  const result = await db.$transaction(async tx => {
    const changed = await tx.form.updateMany({ where: { id, organizationId: organization.id, schemaVersion }, data: { ...input, schemaVersion: { increment: 1 }, connectionCheckedAt: null, connectionCheckedVersion: null } });
    if (changed.count) await tx.activity.create({ data: { organizationId: organization.id, actorId: user.id, subjectId: id, action: "form.updated", details: { schemaVersion: schemaVersion + 1 } } });
    return changed;
  });
  if (!result.count) return { error: "This form was changed or removed. Reload before editing again." };
  revalidatePath(`/forms/${id}`); revalidatePath("/forms");
  return { success: "Form updated." };
}

export type ConnectionState = { error?: string; success?: string; secret?: string };
export async function updateFormConnections(id: string, _state: ConnectionState, formData: FormData): Promise<ConnectionState> {
  const { organization, user } = await requireRole(Role.ADMIN);
  if (!user.emailVerifiedAt) return { error: "Verify your email in Settings first." };
  const form = await db.form.findFirst({ where: { id, organizationId: organization.id } });
  if (!form) return { error: "Form not found." };
  const emails = [...new Set(formData.getAll("notificationEmails").map(String))];
  if (emails.length > 20) return { error: "Choose at most 20 recipients." };
  if (emails.length && !mailConfigured()) return { error: "Email delivery is not configured. Contact the administrator." };
  const members = await db.organizationMember.count({ where: { organizationId: organization.id, user: { email: { in: emails }, emailVerifiedAt: { not: null } } } });
  if (members !== emails.length) return { error: "Choose verified workspace members as recipients." };
  let url: string | null = null;
  try { const value = String(formData.get("webhookUrl") ?? "").trim(); url = value ? webhookUrl(value) : null; } catch { return { error: "Use a public HTTPS webhook URL on port 443." }; }
  const key = url && (!form.webhookSecret || form.webhookUrl !== url || formData.get("rotateSecret") === "on") ? randomToken() : null;
  const changed = await db.$transaction(async tx => {
    const result = await tx.form.updateMany({ where: { id, organizationId: organization.id, updatedAt: form.updatedAt }, data: { notificationEmails: emails, webhookUrl: url, webhookSecret: url ? key ? encrypt(key) : form.webhookSecret : null } });
    if (result.count) await tx.activity.create({ data: { organizationId: organization.id, actorId: user.id, subjectId: id, action: "form.connections_changed", details: { recipientCount: emails.length, webhookEnabled: Boolean(url), secretRotated: Boolean(key) } } });
    return result;
  });
  if (!changed.count) return { error: "The form changed. Reload before saving again." };
  revalidatePath(`/forms/${id}`);
  return { success: "Connections saved.", ...(key ? { secret: key } : {}) };
}

export async function createForm(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  const { organization, user } = await requireRole(Role.ADMIN);
  if (process.env.NODE_ENV === "production" && !user.emailVerifiedAt) return { error: "Verify your email in Settings before creating forms." };
  let input;
  try { input = formInput(formData); await rateLimit("create-form", user.id, 50, 86400); }
  catch (error) { return { error: error instanceof Error ? error.message : "Check your form." }; }
  const { name, schema } = input;
  const key = createFormKey();
  const slug = `${toSlug(name) || "form"}-${crypto.randomUUID().slice(0, 8)}`;
  let created;
  try { created = await db.$transaction(async tx => {
    await checkQuota(tx, organization.id, "forms");
    const form = await tx.form.create({ data: { ...input, slug, keyPrefix: key.prefix, keyHash: key.hash, organizationId: organization.id } });
    await tx.activity.create({ data: { organizationId: organization.id, actorId: user.id, subjectId: form.id, action: "form.created" } });
    return form;
  }); } catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath("/forms");
  return { created: { id: created.id, slug: created.slug, key: key.key, name: created.name, schema, allowedOrigins: created.allowedOrigins } };
}

export async function updateFormStatus(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  const { organization, user } = await requireRole(Role.ADMIN);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as FormStatus;
  if (!Object.values(FormStatus).includes(status)) return { error: "Invalid form status." };
  try { await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organization.id} FOR UPDATE`;
    const form = await tx.form.findFirst({ where: { id, organizationId: organization.id } });
    if (!form) throw new RequestError("Form not found.", 404);
    if (form.status === "ARCHIVED" && status !== "ARCHIVED") await checkQuota(tx, organization.id, "forms");
    await tx.form.update({ where: { id }, data: { status } });
    if (form.status !== status) await tx.activity.create({ data: { organizationId: organization.id, actorId: user.id, subjectId: id, action: "form.status_changed", details: { previousStatus: form.status, status } } });
  }); } catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath(`/forms/${id}`);
  revalidatePath("/forms");
  return { success: "Status saved." };
}

export async function rotateFormKey(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  const { organization, user } = await requireRole(Role.ADMIN);
  const id = String(formData.get("id") ?? "");
  const key = createFormKey();
  const result = await db.$transaction(async tx => {
    const changed = await tx.form.updateMany({ where: { id, organizationId: organization.id }, data: { keyPrefix: key.prefix, keyHash: key.hash, connectionCheckedAt: null, connectionCheckedVersion: null } });
    if (changed.count) await tx.activity.create({ data: { organizationId: organization.id, actorId: user.id, subjectId: id, action: "form.key_rotated" } });
    return changed;
  });
  if (!result.count) throw new Error("Form not found.");
  revalidatePath(`/forms/${id}`);
  return { created: { id, slug: "", key: key.key } };
}
