import { after, NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { validateSubmission } from "@/lib/forms/validate";
import { hashFormKey, hashIp } from "@/lib/keys";
import { leadEmail, mailJob, processDeliveries } from "@/lib/deliveries";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, requestIp, RequestError } from "@/lib/security";
import { checkQuota } from "@/lib/billing";
import { submissionInput } from "@/lib/forms/attribution";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Form-Key, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Cache-Control": "no-store",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const origin = request.headers.get("origin")?.replace(/\/$/, "") ?? null;
  const headers = corsHeaders(origin);
  try {
  const ip = requestIp(request.headers);
  await rateLimit("submission-request", ip, ip === "unknown" ? 600 : 120, 60);
  const rawKey = request.headers.get("x-form-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!rawKey || rawKey.length > 128) return NextResponse.json({ error: "A valid form key is required." }, { status: 401, headers });

  const { slug } = await params;
  const form = await db.form.findFirst({
    where: { slug, keyHash: hashFormKey(rawKey), status: "LIVE" },
  });
  if (!form) return NextResponse.json({ error: "Form not found or inactive." }, { status: 404, headers });
  if (origin && form.allowedOrigins.length && !form.allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "This origin is not allowed." }, { status: 403, headers });
  }

  await rateLimit(`submission-form-${form.id}`, ip, ip === "unknown" ? 60 : 20, 60);
  await rateLimit("submission-form-total", form.id, 300, 60);
  const body = await readJson(request);

  if (body && typeof body === "object" && !Array.isArray(body) && String((body as Record<string, unknown>)._gotcha ?? "")) {
    return NextResponse.json({ ok: true }, { status: 202, headers });
  }

  let input;
  try { input = submissionInput(body); } catch (error) { return NextResponse.json({ error: "Validation failed.", fields: { _context: error instanceof Error ? error.message : "Invalid context." } }, { status: 422, headers }); }
  const validated = validateSubmission(form.schema, input.data);
  if (!validated.success) return NextResponse.json({ error: "Validation failed.", fields: validated.errors }, { status: 422, headers });

  const { submission, deliveryIds } = await db.$transaction(async tx => {
  await checkQuota(tx, form.organizationId, "submissions");
  const submission = await tx.submission.create({
    data: {
      formId: form.id,
      data: validated.data,
      schemaSnapshot: form.schema as Prisma.InputJsonValue,
      attribution: input.attribution,
      sourceOrigin: origin,
      userAgent: request.headers.get("user-agent")?.slice(0, 500),
      ipHash: hashIp(ip),
    },
    select: { id: true, createdAt: true },
  });
  await tx.activity.create({ data: { organizationId: form.organizationId, submissionId: submission.id, subjectId: submission.id, action: "lead.created" } });
  const recipients = await tx.organizationMember.findMany({ where: { organizationId: form.organizationId, user: { email: { in: form.notificationEmails }, emailVerifiedAt: { not: null } } }, select: { user: { select: { email: true } } } });
  const email = leadEmail(form.name, submission.id);
  const jobs: Prisma.OutboundDeliveryCreateManyInput[] = recipients.map(({ user }) => ({ ...mailJob(user.email, email.subject, email.text, undefined, form.id), submissionId: submission.id }));
  if (form.webhookUrl && form.webhookSecret) jobs.push({ kind: "WEBHOOK", formId: form.id, submissionId: submission.id, payload: { url: form.webhookUrl, event: { id: submission.id, type: "submission.created", createdAt: submission.createdAt.toISOString(), form: { id: form.id, name: form.name, slug: form.slug }, data: validated.data, attribution: input.attribution } } });
  const created = jobs.length ? await tx.outboundDelivery.createManyAndReturn({ data: jobs, select: { id: true } }) : [];
  return { submission, deliveryIds: created.map(job => job.id) };
  });
  if (deliveryIds.length) after(async () => { await processDeliveries(deliveryIds); });
  return NextResponse.json({ ok: true, submission }, { status: 201, headers });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { ...headers, ...(error.status === 429 ? { "Retry-After": "60" } : {}) } });
    throw error;
  }
}
