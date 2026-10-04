import { AgentKit } from "@/components/agent-kit";
import { Download, ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { KeyRotator } from "@/components/key-rotator";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { db } from "@/lib/db";
import { parseFormSchema } from "@/lib/forms/validate";
import { getCurrentContext } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { FormConnections } from "@/components/form-connections";
import { RetryDelivery } from "@/components/retry-delivery";
import { mailConfigured } from "@/lib/deliveries";
import { FormStatusControl } from "@/components/form-status";
import { historicalColumns } from "@/lib/forms/history";

function valueLabel(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "—");
}

export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { organization, membership } = await getCurrentContext();
  const canAdmin = membership.role === Role.OWNER || membership.role === Role.ADMIN;
  const { id } = await params;
  const form = await db.form.findFirst({
    where: { id, organizationId: organization.id },
    include: { submissions: { orderBy: { createdAt: "desc" }, take: 100 }, _count: { select: { submissions: true } } },
  });
  if (!form) notFound();
  const members = canAdmin ? await db.organizationMember.findMany({ where: { organizationId: organization.id }, select: { user: { select: { name: true, email: true, emailVerifiedAt: true } } } }) : [];
  const deliveries = canAdmin ? await db.outboundDelivery.findMany({ where: { formId: id }, orderBy: { createdAt: "desc" }, take: 20 }) : [];
  const schema = parseFormSchema(form.schema);
  const columns = historicalColumns(form.schema, form.submissions);
  const endpoint = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/v1/forms/${form.slug}/submissions`;
  const sample = Object.fromEntries(schema.fields.map((field) => [field.id, field.type === "checkbox" ? true : field.type === "number" ? 1 : field.type === "email" ? "person@example.com" : field.type === "select" ? field.options?.[0] : `Your ${field.label.toLowerCase()}`]));
  const snippet = `const params = new URLSearchParams(location.search);\nconst campaign = Object.fromEntries(\n  ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]\n    .filter(key => params.get(key))\n    .map(key => [key, params.get(key).slice(0, 200)])\n);\n\nfetch("${endpoint}", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json",\n    "X-Form-Key": "YOUR_FORM_KEY"\n  },\n  body: JSON.stringify({\n    ...${JSON.stringify(sample, null, 2).replaceAll("\n", "\n    ")},\n    _gotcha: "",\n    _context: {\n      landing_page: location.origin + location.pathname,\n      referrer: document.referrer || undefined,\n      ...campaign\n    }\n  })\n});`;

  return <div className="page">
    <PageHeader eyebrow="Form details" title={form.name} description={`${form._count.submissions} total submissions · Created ${form.createdAt.toLocaleDateString("en", { dateStyle: "medium" })}`} action={<div className="header-actions"><StatusPill status={form.status} />{canAdmin && <Link className="button button-secondary" href={`/forms/${id}/edit`}><Pencil size={15} />Edit form</Link>}<a className="button button-secondary" href={`/api/forms/${form.id}/export`}><Download size={15} />Export CSV</a></div>} />
    <AgentKit name={form.name} endpoint={endpoint} schema={schema} origins={form.allowedOrigins} />
    <div className="detail-grid">
      <section className="panel form-section detail-main">
        <div className="panel-header"><div><p className="eyebrow">Integration</p><h2>Send responses here</h2></div><CopyButton value={snippet} label="Copy code" /></div>
        <div className="endpoint-row"><span>POST</span><code>{endpoint}</code><CopyButton value={endpoint} /></div>
        <pre className="code-block"><code>{snippet}</code></pre>
        <p className="quiet-note">Keep a hidden input named <code>_gotcha</code> in your HTML form and send its value. Real users leave it empty; simple bots do not.</p>
      </section>
      <aside className="detail-aside">
        <section className="panel compact-panel"><p className="eyebrow">API access</p><h2>Publishable key</h2><p>Current key begins with <code>{form.keyPrefix}</code>. Keys are only shown when created or rotated.</p>{canAdmin && <KeyRotator formId={form.id} />}</section>
        <section className="panel compact-panel"><p className="eyebrow">Availability</p><h2>Status</h2>{canAdmin ? <FormStatusControl id={id} status={form.status} /> : <div className="readonly-status"><StatusPill status={form.status} /></div>}</section>
        <section className="panel compact-panel"><p className="eyebrow">Browser origins</p><h2>{form.allowedOrigins.length ? `${form.allowedOrigins.length} allowed` : "Any origin"}</h2>{form.allowedOrigins.length > 0 && <ul className="origin-list">{form.allowedOrigins.map((origin) => <li key={origin}>{origin}</li>)}</ul>}</section>
      </aside>
    </div>
    <section className="panel panel-flush" id="submissions">
      <div className="panel-header padded"><div><p className="eyebrow">Inbox</p><h2>Latest responses</h2></div><Link className="text-link" href={`/submissions?form=${id}`}>View all enquiries</Link></div>
      {form.submissions.length ? <div className="wide-table"><table><thead><tr>{columns.map((field) => <th key={field.id}>{field.labels.join(" / ")}</th>)}<th>Received</th><th>Enquiry</th></tr></thead><tbody>{form.submissions.map((submission) => { const data = submission.data as Record<string, unknown>; return <tr key={submission.id}>{columns.map((field) => <td key={field.id}>{valueLabel(data[field.id])}</td>)}<td><time>{submission.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</time></td><td><Link className="text-link" href={`/submissions/${submission.id}`}>Open enquiry</Link></td></tr>; })}</tbody></table></div> : <div className="mini-empty"><p>No responses yet.</p><span>Use the endpoint above to send your first one.</span></div>}
    </section>
    {canAdmin && <section className="panel form-section"><div className="panel-header"><h2>Notifications and webhook</h2></div><FormConnections id={id} members={members.map(({ user }) => ({ name: user.name, email: user.email, verified: Boolean(user.emailVerifiedAt) }))} emails={form.notificationEmails} url={form.webhookUrl} hasSecret={Boolean(form.webhookSecret)} mailEnabled={mailConfigured()} />{deliveries.length > 0 && <div className="delivery-list"><h3>Recent deliveries</h3>{deliveries.map(job => <div key={job.id}><span>{job.kind.toLowerCase()}<small>{job.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</small></span><span>{job.status.toLowerCase()}<small>{job.lastError}</small></span>{job.status === "FAILED" && <RetryDelivery id={job.id} />}</div>)}</div>}</section>}
    <section className="panel form-section"><div className="panel-header"><div><p className="eyebrow">Contract</p><h2>Accepted fields</h2></div><Link className="text-link" href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API" target="_blank">Fetch API <ExternalLink size={13} /></Link></div><div className="schema-list">{schema.fields.map((field) => <div key={field.id}><code>{field.id}</code><span>{field.type}</span><small>{field.required ? "required" : "optional"}</small></div>)}</div></section>
  </div>;
}
