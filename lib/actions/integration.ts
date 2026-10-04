"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { authorizeForm, formPayload, recordConnectionCheck } from "@/lib/forms/endpoint";
import { sampleAnswers } from "@/lib/forms/integration";
import { parseFormSchema } from "@/lib/forms/validate";
import { RequestError } from "@/lib/security";

export async function checkConnection(id: string, key: string, origin: string) {
  const { organization, user } = await requireRole(Role.ADMIN);
  if (!user.emailVerifiedAt) return { error: "Verify your email first." };
  try {
    await rateLimit("dashboard-connection-check", user.id, 30, 60);
    const scoped = await db.form.findFirst({ where: { id, organizationId: organization.id } });
    if (!scoped) return { error: "Form not found." };
    let url;
    try { url = new URL(origin); } catch { return { error: "Choose the full origin of your website." }; }
    if (!['http:', 'https:'].includes(url.protocol) || origin.length > 2048 || url.origin !== origin) return { error: "Use an HTTP/HTTPS origin without a path or credentials." };
    const form = await authorizeForm(scoped.slug, key, origin);
    const payload = formPayload(form.schema, sampleAnswers(parseFormSchema(form.schema)));
    if (!payload.success) return { error: "The sample answers do not satisfy this schema. Run a test from your website with valid answers." };
    await recordConnectionCheck(form, user.id);
  } catch (error) { if (error instanceof RequestError) return { error: error.message }; throw error; }
  revalidatePath(`/forms/${id}/connect`); revalidatePath(`/forms/${id}`);
  return { success: "Endpoint checked. No enquiry or email was created.", checkedAt: new Date().toISOString() };
}
