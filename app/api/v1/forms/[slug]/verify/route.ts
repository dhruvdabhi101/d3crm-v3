import { NextResponse } from "next/server";
import { authorizeForm, corsHeaders, formPayload, recordConnectionCheck } from "@/lib/forms/endpoint";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, requestIp, RequestError } from "@/lib/security";

export async function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) }); }

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const origin = request.headers.get("origin")?.replace(/\/$/, "") ?? null;
  const headers = corsHeaders(origin);
  try {
    await rateLimit("connection-check-ip", requestIp(request.headers), 60, 60);
    const form = await authorizeForm((await params).slug, request.headers.get("x-form-key"), origin);
    await rateLimit("connection-check-form", form.id, 10, 60);
    const body = await readJson(request);
    const payload = formPayload(form.schema, body);
    if (!payload.success) return NextResponse.json({ error: "Validation failed.", fields: payload.errors }, { status: 422, headers });
    if (body && typeof body === "object" && String((body as Record<string, unknown>)._gotcha ?? "")) return NextResponse.json({ error: "The honeypot must be empty." }, { status: 422, headers });
    await recordConnectionCheck(form);
    return NextResponse.json({ ok: true, test: true, schemaVersion: form.schemaVersion }, { headers });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { ...headers, ...(error.status === 429 ? { "Retry-After": "60" } : {}) } });
    throw error;
  }
}
