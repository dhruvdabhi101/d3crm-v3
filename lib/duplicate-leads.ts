import type { Prisma } from "@prisma/client";
import { db } from "./db.ts";
import { primaryContactEmail } from "./forms/contact.ts";

export async function relatedEnquiries(organizationId: string, submissionId: string) {
  const current = await db.submission.findFirst({
    where: { id: submissionId, form: { organizationId }, status: { not: "SPAM" } },
    select: { data: true, schemaSnapshot: true, form: { select: { schema: true } } },
  });
  const email = current ? primaryContactEmail(current.schemaSnapshot ?? current.form.schema, current.data) : null;
  if (!email) return { total: 0, items: [] };
  const where: Prisma.SubmissionWhereInput = {
    id: { not: submissionId },
    contactEmail: email,
    status: { not: "SPAM" },
    form: { organizationId },
  };
  const [total, items] = await Promise.all([
    db.submission.count({ where }),
    db.submission.findMany({
      where,
      select: { id: true, createdAt: true, status: true, form: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
  ]);
  return { total, items };
}
