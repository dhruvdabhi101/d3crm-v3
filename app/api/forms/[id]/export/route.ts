import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseFormSchema } from "@/lib/forms/validate";
import { getCurrentContext } from "@/lib/permissions";

function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { organization } = await getCurrentContext();
  const { id } = await params;
  const form = await db.form.findFirst({
    where: { id, organizationId: organization.id },
    include: { submissions: { orderBy: { createdAt: "desc" } } },
  });
  if (!form) return NextResponse.json({ error: "Form not found." }, { status: 404 });

  const schema = parseFormSchema(form.schema);
  const headers = ["submission_id", "submitted_at", ...schema.fields.map((field) => field.id)];
  const rows = form.submissions.map((submission) => {
    const data = submission.data as Record<string, unknown>;
    return [submission.id, submission.createdAt.toISOString(), ...schema.fields.map((field) => data[field.id])];
  });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const filename = `${form.slug}-submissions.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
