"use server";

import { FormStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseFormSchema } from "@/lib/forms/validate";
import { createFormKey } from "@/lib/keys";
import { requireRole } from "@/lib/permissions";
import { toSlug } from "@/lib/slug";

export type FormActionState = { error?: string; created?: { id: string; slug: string; key: string } };

export async function createForm(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  const { organization } = await requireRole(Role.ADMIN);
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 100) return { error: "Use a form name between 2 and 100 characters." };

  let schema;
  try {
    schema = parseFormSchema(JSON.parse(String(formData.get("schema") ?? "")));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid form schema." };
  }

  const originInputs = String(formData.get("allowedOrigins") ?? "")
    .split(/[\n,]/)
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  let allowedOrigins: string[];
  try {
    allowedOrigins = originInputs.map((origin) => {
      const url = new URL(origin);
      if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) throw new Error();
      return url.origin;
    });
  } catch {
    return { error: "Allowed origins must be full origins like https://example.com, without paths." };
  }

  const key = createFormKey();
  const slug = `${toSlug(name) || "form"}-${crypto.randomUUID().slice(0, 8)}`;
  const created = await db.form.create({
    data: {
      name,
      slug,
      schema,
      allowedOrigins: [...new Set(allowedOrigins)],
      keyPrefix: key.prefix,
      keyHash: key.hash,
      organizationId: organization.id,
    },
  });
  revalidatePath("/forms");
  return { created: { id: created.id, slug: created.slug, key: key.key } };
}

export async function updateFormStatus(formData: FormData) {
  const { organization } = await requireRole(Role.ADMIN);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as FormStatus;
  if (!Object.values(FormStatus).includes(status)) throw new Error("Invalid form status.");
  await db.form.updateMany({ where: { id, organizationId: organization.id }, data: { status } });
  revalidatePath(`/forms/${id}`);
  revalidatePath("/forms");
}

export async function rotateFormKey(_state: FormActionState, formData: FormData): Promise<FormActionState> {
  const { organization } = await requireRole(Role.ADMIN);
  const id = String(formData.get("id") ?? "");
  const key = createFormKey();
  const result = await db.form.updateMany({ where: { id, organizationId: organization.id }, data: { keyPrefix: key.prefix, keyHash: key.hash } });
  if (!result.count) throw new Error("Form not found.");
  revalidatePath(`/forms/${id}`);
  return { created: { id, slug: "", key: key.key } };
}
