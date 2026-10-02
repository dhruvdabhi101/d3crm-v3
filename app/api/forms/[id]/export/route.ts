import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseFormSchema } from "@/lib/forms/validate";
import { getCurrentContext } from "@/lib/permissions";
import { csvCell } from "@/lib/security";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organization } = await getCurrentContext();
  const { id } = await params;
  const form = await db.form.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!form) return NextResponse.json({ error: "Form not found." }, { status: 404 });

  const schema = parseFormSchema(form.schema);
  const previous = await db.$queryRaw<{ key: string }[]>`SELECT DISTINCT jsonb_object_keys(data) AS key FROM "Submission" WHERE "formId" = ${id}`;
  const keys = [...new Set([...schema.fields.map(field => field.id), ...previous.map(row => row.key)])];
  const headers = ["submission_id", "submitted_at", "status", ...keys];
  const encoder = new TextEncoder(); const cutoff = new Date();
  let first = true; let last: { id: string; createdAt: Date } | null = null;
  const stream = new ReadableStream<Uint8Array>({ async pull(controller) {
    if (first) { controller.enqueue(encoder.encode(`\uFEFF${headers.map(csvCell).join(",")}\r\n`)); first = false; return; }
    try {
      const submissions = await db.submission.findMany({ where: { formId: id, form: { organizationId: organization.id }, createdAt: { lte: cutoff }, ...(last ? { OR: [{ createdAt: { lt: last.createdAt } }, { createdAt: last.createdAt, id: { lt: last.id } }] } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 500 });
      for (const submission of submissions) {
        const data = submission.data as Record<string, unknown>;
        controller.enqueue(encoder.encode([submission.id, submission.createdAt.toISOString(), submission.status, ...keys.map(key => data[key])].map(csvCell).join(",") + "\r\n"));
      }
      if (submissions.length < 500) controller.close();
      else last = submissions[submissions.length - 1];
    } catch (error) { controller.error(error); }
  } });
  const filename = `${form.slug}-submissions.csv`;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
