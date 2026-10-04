import { after, NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/keys";
import { leadEmail, mailJob, processDeliveries } from "@/lib/deliveries";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, requestIp, RequestError } from "@/lib/security";
import { checkQuota } from "@/lib/billing";
import { authorizeForm, corsHeaders, formPayload } from "@/lib/forms/endpoint";
import { chooseAssignee } from "@/lib/assignment";

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
  const { slug } = await params;
  const form = await authorizeForm(slug, rawKey ?? null, origin);

  await rateLimit(`submission-form-${form.id}`, ip, ip === "unknown" ? 60 : 20, 60);
  await rateLimit("submission-form-total", form.id, 300, 60);
  const body = await readJson(request);

  if (body && typeof body === "object" && !Array.isArray(body) && String((body as Record<string, unknown>)._gotcha ?? "")) {
    return NextResponse.json({ ok: true }, { status: 202, headers });
  }

  const validated = formPayload(form.schema, body);
  if (!validated.success) return NextResponse.json({ error: "Validation failed.", fields: validated.errors }, { status: 422, headers });

  const { submission, deliveryIds } = await db.$transaction(async tx => {
  await checkQuota(tx, form.organizationId, "submissions");
  const assignment = await chooseAssignee(tx, form.id, form.organizationId);
  const submission = await tx.submission.create({
    data: {
      formId: form.id,
      data: validated.data,
      schemaSnapshot: form.schema as Prisma.InputJsonValue,
      attribution: validated.attribution,
      assigneeId: assignment.assigneeId,
      sourceOrigin: origin,
      userAgent: request.headers.get("user-agent")?.slice(0, 500),
      ipHash: hashIp(ip),
    },
    select: { id: true, createdAt: true },
  });
  await tx.activity.create({ data: { organizationId: form.organizationId, submissionId: submission.id, subjectId: submission.id, action: "lead.created" } });
  if (assignment.assigneeId) await tx.activity.create({ data: { organizationId: form.organizationId, submissionId: submission.id, subjectId: submission.id, action: "lead.auto_assigned", details: assignment } });
  const recipients = await tx.organizationMember.findMany({ where: { organizationId: form.organizationId, user: { email: { in: form.notificationEmails }, emailVerifiedAt: { not: null } } }, select: { user: { select: { email: true } } } });
  const email = leadEmail(form.name, submission.id);
  const jobs: Prisma.OutboundDeliveryCreateManyInput[] = recipients.map(({ user }) => ({ ...mailJob(user.email, email.subject, email.text, undefined, form.id), submissionId: submission.id }));
  if (form.webhookUrl && form.webhookSecret) jobs.push({ kind: "WEBHOOK", formId: form.id, submissionId: submission.id, payload: { url: form.webhookUrl, event: { id: submission.id, type: "submission.created", createdAt: submission.createdAt.toISOString(), form: { id: form.id, name: form.name, slug: form.slug }, data: validated.data, attribution: validated.attribution, assigneeId: assignment.assigneeId } } });
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
