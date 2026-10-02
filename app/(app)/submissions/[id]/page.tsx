import { Role } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { DeleteSubmissionButton, SubmissionControls, SubmissionNoteForm } from "@/components/submission-controls";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";
import { parseFormSchema } from "@/lib/forms/validate";
import { statusLabel } from "@/lib/leads";

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { organization, membership } = await getCurrentContext();
  const { id } = await params;
  const submission = await db.submission.findFirst({ where: { id, form: { organizationId: organization.id } }, include: { form: true, notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } } } });
  if (!submission) notFound();
  const members = await db.organizationMember.findMany({ where: { organizationId: organization.id, role: { in: ["OWNER", "ADMIN", "MEMBER"] } }, select: { user: { select: { id: true, name: true } } } });
  const schema = parseFormSchema(submission.schemaSnapshot ?? submission.form.schema);
  const data = submission.data as Record<string, unknown>;
  const canWrite = membership.role !== Role.VIEWER;
  return <div className="page"><Link className="text-link" href="/submissions"><ArrowLeft size={16} />Inbox</Link><PageHeader title="Enquiry" description={`${submission.form.name} · ${submission.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}`} />
    <div className="enquiry-detail"><section className="enquiry-content"><dl className="response-details">{Object.entries(data).map(([key, value]) => <div key={key}><dt>{schema.fields.find(field => field.id === key)?.label ?? key}</dt><dd>{typeof value === "boolean" ? value ? "Yes" : "No" : String(value ?? "")}</dd></div>)}</dl><p className="quiet-note">Source: {submission.sourceOrigin ?? "Not recorded"}</p>
      <h2>Notes</h2>{canWrite && <SubmissionNoteForm id={id} />}{submission.notes.map(note => <article className="note-row" key={note.id}><p>{note.body}</p><small>{note.author.name} · {note.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</small></article>)}
    </section><aside className="enquiry-sidebar"><h2>Follow-up</h2>{canWrite ? <SubmissionControls id={id} status={submission.status} assigneeId={submission.assigneeId} followUpAt={submission.followUpAt?.toISOString() ?? null} updatedAt={submission.updatedAt.toISOString()} read={Boolean(submission.readAt)} members={members.map(member => member.user)} /> : <p>{statusLabel(submission.status)}</p>}{[Role.ADMIN, Role.OWNER].includes(membership.role as "ADMIN" | "OWNER") && <DeleteSubmissionButton id={id} />}</aside></div>
  </div>;
}
