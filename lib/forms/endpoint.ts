import { db } from "../db.ts";
import { hashFormKey } from "../keys.ts";
import { RequestError } from "../security.ts";
import { submissionInput } from "./attribution.ts";
import { validateSubmission } from "./validate.ts";

export function corsHeaders(origin: string | null) {
  return { "Access-Control-Allow-Origin": origin ?? "*", "Access-Control-Allow-Headers": "Content-Type, X-Form-Key, Authorization", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400", Vary: "Origin", "Cache-Control": "no-store" };
}

export async function authorizeForm(slug: string, key: string | null, origin: string | null) {
  if (!key || key.length > 128) throw new RequestError("A valid form key is required.", 401);
  const form = await db.form.findFirst({ where: { slug, keyHash: hashFormKey(key), status: "LIVE" } });
  if (!form) throw new RequestError("Form not found or inactive.", 404);
  if (origin && form.allowedOrigins.length && !form.allowedOrigins.includes(origin)) throw new RequestError("This origin is not allowed.", 403);
  return form;
}

export function formPayload(schema: unknown, body: unknown) {
  let input;
  try { input = submissionInput(body); } catch (error) { return { success: false as const, errors: { _context: error instanceof Error ? error.message : "Invalid context." } }; }
  const result = validateSubmission(schema, input.data);
  return result.success ? { ...result, attribution: input.attribution } : result;
}

export async function recordConnectionCheck(form: Awaited<ReturnType<typeof authorizeForm>>, actorId?: string) {
  await db.$transaction(async tx => {
    const saved = await tx.form.updateMany({ where: { id: form.id, keyHash: form.keyHash, status: "LIVE", schemaVersion: form.schemaVersion, updatedAt: form.updatedAt }, data: { connectionCheckedAt: new Date(), connectionCheckedVersion: form.schemaVersion } });
    if (!saved.count) throw new RequestError("The form changed. Run the check again.", 409);
    await tx.activity.create({ data: { organizationId: form.organizationId, actorId, subjectId: form.id, action: "form.connection_checked", details: { schemaVersion: form.schemaVersion } } });
  });
}
