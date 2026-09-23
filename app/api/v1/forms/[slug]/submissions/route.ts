import { FormStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateSubmission } from "@/lib/forms/validate";
import { hashFormKey, hashIp } from "@/lib/keys";

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_PER_MINUTE = 20;

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Form-Key, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const origin = request.headers.get("origin")?.replace(/\/$/, "") ?? null;
  const headers = corsHeaders(origin);
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload is too large." }, { status: 413, headers });

  const rawKey = request.headers.get("x-form-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!rawKey || rawKey.length > 128) return NextResponse.json({ error: "A valid form key is required." }, { status: 401, headers });

  const { slug } = await params;
  const form = await db.form.findFirst({
    where: { slug, keyHash: hashFormKey(rawKey), status: FormStatus.LIVE },
    select: { id: true, schema: true, allowedOrigins: true },
  });
  if (!form) return NextResponse.json({ error: "Form not found or inactive." }, { status: 404, headers });
  if (origin && form.allowedOrigins.length && !form.allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: "This origin is not allowed." }, { status: 403, headers });
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload is too large." }, { status: 413, headers });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Submit valid JSON." }, { status: 400, headers });
  }

  if (body && typeof body === "object" && !Array.isArray(body) && String((body as Record<string, unknown>)._gotcha ?? "")) {
    return NextResponse.json({ ok: true }, { status: 202, headers });
  }

  const forwarded = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ipHash = forwarded ? hashIp(forwarded) : null;
  if (ipHash) {
    const recentCount = await db.submission.count({
      where: { formId: form.id, ipHash, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (recentCount >= RATE_LIMIT_PER_MINUTE) return NextResponse.json({ error: "Too many submissions. Try again shortly." }, { status: 429, headers });
  }

  const validated = validateSubmission(form.schema, body);
  if (!validated.success) return NextResponse.json({ error: "Validation failed.", fields: validated.errors }, { status: 422, headers });

  const submission = await db.submission.create({
    data: {
      formId: form.id,
      data: validated.data,
      sourceOrigin: origin,
      userAgent: request.headers.get("user-agent")?.slice(0, 500),
      ipHash,
    },
    select: { id: true, createdAt: true },
  });
  return NextResponse.json({ ok: true, submission }, { status: 201, headers });
}
