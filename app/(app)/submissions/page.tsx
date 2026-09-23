import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";

function renderValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "—");
}

export default async function SubmissionsPage() {
  const { organization } = await getCurrentContext();
  const submissions = await db.submission.findMany({ where: { form: { organizationId: organization.id } }, include: { form: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="page">
      <PageHeader eyebrow="Unified inbox" title="Submissions" description="The latest 200 responses across every form in this organization." />
      <section className="panel panel-flush">
        {submissions.length ? <div className="submission-table" role="table">
          <div className="table-head" role="row"><span>Form</span><span>Response</span><span>Received</span></div>
          {submissions.map((submission) => {
            const entries = Object.entries(submission.data as Record<string, unknown>);
            return <div className="table-row" role="row" key={submission.id}><strong>{submission.form.name}</strong><span className="response-preview">{entries.slice(0, 3).map(([key, value]) => <span key={key}><small>{key.replaceAll("_", " ")}</small>{renderValue(value)}</span>)}</span><time>{submission.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</time></div>;
          })}
        </div> : <EmptyState title="Your inbox is quiet" description="Once someone submits one of your live forms, their response will appear here." />}
      </section>
    </div>
  );
}
