import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { RequestError } from "@/lib/security";
import { searchQuery, searchTitle, type SearchResult } from "@/lib/workspace-search";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to search." }, { status: 401, headers });
  const current = await db.user.findUnique({ where: { id: session.user.id }, select: { sessionVersion: true } });
  if (!current || current.sessionVersion !== session.user.sessionVersion) return NextResponse.json({ error: "Your session has expired." }, { status: 401, headers });
  try {
    const { organization, user } = await getCurrentContext();
    const q = searchQuery(new URL(request.url).searchParams.get("q"));
    if (!q) return NextResponse.json({ results: [] }, { headers });
    await rateLimit("workspace-search", user.id, 300, 3600);
    const literalQuery = q.replace(/[\\%_]/g, "\\$&");
    const [forms, leads] = await Promise.all([
      db.form.findMany({ where: { organizationId: organization.id, name: { contains: literalQuery, mode: "insensitive" } }, select: { id: true, name: true, status: true }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 5 }),
      db.$queryRaw<{ id: string; data: unknown; name: string }[]>`SELECT s.id, s.data, f.name FROM "Submission" s JOIN "Form" f ON f.id = s."formId" WHERE f."organizationId" = ${organization.id} AND s.data::text ILIKE ${`%${literalQuery}%`} ORDER BY s."createdAt" DESC, s.id DESC LIMIT 10`,
    ]);
    const results: SearchResult[] = [
      ...forms.map(form => ({ id: form.id, title: form.name, detail: `${form.status[0]}${form.status.slice(1).toLowerCase()} form`, href: `/forms/${form.id}`, kind: "form" as const })),
      ...leads.map(lead => ({ id: lead.id, title: searchTitle(lead.data), detail: lead.name, href: `/submissions/${lead.id}`, kind: "enquiry" as const })),
    ];
    return NextResponse.json({ results }, { headers });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    throw error;
  }
}
