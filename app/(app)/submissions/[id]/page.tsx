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
import { activityLabel } from "@/lib/activity";
import { ATTRIBUTION_KEYS, type Attribution } from "@/lib/forms/attribution";

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { organization, membership } = await getCurrentContext();
  const { id } = await params;
  const submission = await db.submission.findFirst({ where: { id, form: { organizationId: organization.id } }, include: { form: true, notes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" } }, activities: { where: { organizationId: organization.id }, include: { actor: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100 } } });
  if (!submission) notFound();
  const members = await db.organizationMember.findMany({ where: { organizationId: organization.id, role: { in: ["OWNER", "ADMIN", "MEMBER"] } }, select: { user: { select: { id: true, name: true } } } });
  const schema = parseFormSchema(submission.schemaSnapshot ?? submission.form.schema);
  const data = submission.data as Record<string, unknown>;
  const attribution = submission.attribution as Attribution | null;
  const canWrite = membership.role !== Role.VIEWER;
  return <div className="page"><Link className="text-link" href="/submissions"><ArrowLeft size={16} />Inbox</Link><PageHeader title="Enquiry" description={`${submission.form.name} · ${submission.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}`} />
    <div className="enquiry-detail"><section className="enquiry-content"><dl className="response-details">{Object.entries(data).map(([key, value]) => <div key={key}><dt>{schema.fields.find(field => field.id === key)?.label ?? key}</dt><dd>{typeof value === "boolean" ? value ? "Yes" : "No" : String(value ?? "")}</dd></div>)}</dl><p className="quiet-note">Browser origin: {submission.sourceOrigin ?? "Not recorded"}</p>
      <h2>Notes</h2>{canWrite && <SubmissionNoteForm id={id} />}{submission.notes.map(note => <article className="note-row" key={note.id}><p>{note.body}</p><small>{note.author.name} · {note.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</small></article>)}
      <h2>Reported source</h2><dl className="response-details">{ATTRIBUTION_KEYS.filter(key => attribution?.[key]).map(key => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{attribution![key]}</dd></div>)}</dl>{!attribution || !Object.keys(attribution).length ? <p className="quiet-note">Not recorded.</p> : null}
      <h2>Activity</h2><ol className="activity-list">{submission.activities.map(entry => <li key={entry.id}><div><strong>{activityLabel(entry)}</strong><span>{entry.actor?.name ?? (["lead.created", "lead.auto_assigned"].includes(entry.action) ? "Website" : "Former team member")}</span></div><time>{entry.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</time></li>)}</ol>{!submission.activities.length && <p className="quiet-note">No activity recorded.</p>}
    </section><aside className="enquiry-sidebar"><h2>Follow-up</h2>{canWrite ? <SubmissionControls id={id} status={submission.status} assigneeId={submission.assigneeId} followUpAt={submission.followUpAt?.toISOString() ?? null} updatedAt={submission.updatedAt.toISOString()} read={Boolean(submission.readAt)} members={members.map(member => member.user)} /> : <p>{statusLabel(submission.status)}</p>}{[Role.ADMIN, Role.OWNER].includes(membership.role as "ADMIN" | "OWNER") && <DeleteSubmissionButton id={id} />}</aside></div>
  </div>;
}
