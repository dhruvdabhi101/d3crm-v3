
import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { ArrowRight, Check, CircleDashed, Download, ExternalLink, Pencil, Plug } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { fetchExample } from "@/lib/forms/integration";
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
import { FormRouting } from "@/components/form-routing";
import { FormDuplicator } from "@/components/form-duplicator";

function valueLabel(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "—");
}

export default async function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { organization, membership, user } = await getCurrentContext();
  const canAdmin = membership.role === Role.OWNER || membership.role === Role.ADMIN;
  const { id } = await params;
  const form = await db.form.findFirst({
    where: { id, organizationId: organization.id },
    include: { submissions: { orderBy: { createdAt: "desc" }, take: 100 }, _count: { select: { submissions: true } } },
  });
  if (!form) notFound();
  const members = canAdmin ? await db.organizationMember.findMany({ where: { organizationId: organization.id }, select: { user: { select: { name: true, email: true, emailVerifiedAt: true } } } }) : [];
  const assignees = canAdmin ? await db.organizationMember.findMany({ where: { organizationId: organization.id, role: { in: ["OWNER", "ADMIN", "MEMBER"] } }, select: { user: { select: { id: true, name: true } } } }) : [];
  const deliveries = canAdmin ? await db.outboundDelivery.findMany({ where: { formId: id }, orderBy: { createdAt: "desc" }, take: 20 }) : [];
  const schema = parseFormSchema(form.schema);
  const columns = historicalColumns(form.schema, form.submissions);
  const endpoint = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/v1/forms/${form.slug}/submissions`;
  const checked = form.connectionCheckedVersion === form.schemaVersion ? form.connectionCheckedAt : null;
  const latest = form.submissions[0]?.createdAt ?? null;
  const connected = Boolean(latest);
  const utc = (value: Date) => `${value.toLocaleString("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`;

  return <div className="page">
    <PageHeader title={form.name} description={`${form._count.submissions} total submissions · Created ${form.createdAt.toLocaleDateString("en", { dateStyle: "medium" })}`} action={<div className="header-actions"><StatusPill status={form.status} />{canAdmin && <Button asChild variant="outline"><Link className="button button-secondary" href={`/forms/${id}/edit`}><Pencil size={15} />Edit form</Link></Button>}{canAdmin && <Button asChild variant="outline"><Link className="button button-secondary" href={`/forms/${id}/connect`}><Plug size={15} />Connect website</Link></Button>}<Button asChild variant="outline"><a className="button button-secondary" href={`/api/forms/${form.id}/export`}><Download size={15} />Export CSV</a></Button></div>} />
    {canAdmin && <FormDuplicator key={id} id={id} name={form.name} verified={Boolean(user.emailVerifiedAt)} />}
    <div className="detail-grid">
      <Card className="panel connection-card detail-main" data-connected={connected || undefined}>
        <header className="guide-head"><h2>{connected ? "Your website is sending enquiries" : "Put this form on your website"}</h2><p>{connected ? "Everything is connected. Use the setup guide again if you rebuild your site or change the form." : "A four-step guide: choose how to add it, add your key, hand it off to your AI agent or developer, and check it works."}</p></header>
        <ul className="check-list">
          <li data-ok={form.status === "LIVE" || undefined}><span className="check-state" aria-hidden="true">{form.status === "LIVE" ? <Check size={14} strokeWidth={2.5} /> : <CircleDashed size={14} />}</span><span><strong>Form is live</strong><small>{form.status === "LIVE" ? "Accepting enquiries" : "Paused. Turn it on to accept enquiries."}</small></span></li>
          <li data-ok={Boolean(checked) || undefined}><span className="check-state" aria-hidden="true">{checked ? <Check size={14} strokeWidth={2.5} /> : <CircleDashed size={14} />}</span><span><strong>Key and website accepted</strong><small>{checked ? `Checked ${utc(checked)}` : "Not checked yet"}</small></span></li>
          <li data-ok={connected || undefined}><span className="check-state" aria-hidden="true">{connected ? <Check size={14} strokeWidth={2.5} /> : <CircleDashed size={14} />}</span><span><strong>First enquiry received</strong><small>{latest ? `Latest ${utc(latest)}` : "Waiting for a submission from your site"}</small></span></li>
        </ul>
        <div className="connection-actions">{canAdmin ? <Button asChild variant={connected ? "outline" : "default"}><Link className={connected ? "button button-secondary" : "button button-primary"} href={`/forms/${id}/connect`}>{connected ? "Open setup guide" : "Start setup guide"}<ArrowRight size={15} /></Link></Button> : <p className="quiet-note">Ask a workspace admin to connect this form.</p>}</div>
        <details className="prompt-preview developer-details"><summary>Developer details</summary><div className="endpoint-row"><span>POST</span><code>{endpoint}</code><CopyButton value={endpoint} /></div><pre tabIndex={0}>{fetchExample(endpoint, schema)}</pre><p className="quiet-note">Send a hidden <code>_gotcha</code> input with each request. Real visitors leave it empty; simple bots don&apos;t.</p></details>
      </Card>
      <aside className="detail-aside">
        <Card className="panel compact-panel" id="api-key"><p className="eyebrow">API access</p><h2>Publishable key</h2><p>Current key begins with <code>{form.keyPrefix}</code>. Keys are only shown when created or rotated.</p>{canAdmin && <KeyRotator formId={form.id} />}</Card>
        <Card className="panel compact-panel"><p className="eyebrow">Availability</p><h2>Status</h2>{canAdmin ? <FormStatusControl id={id} status={form.status} /> : <div className="readonly-status"><StatusPill status={form.status} /></div>}</Card>
        <Card className="panel compact-panel"><p className="eyebrow">Browser origins</p><h2>{form.allowedOrigins.length ? `${form.allowedOrigins.length} allowed` : "Any origin"}</h2>{form.allowedOrigins.length > 0 && <ul className="origin-list">{form.allowedOrigins.map((origin) => <li key={origin}>{origin}</li>)}</ul>}</Card>
      </aside>
    </div>
    <Card className="panel panel-flush" id="submissions">
      <div className="panel-header padded"><div><p className="eyebrow">Inbox</p><h2>Latest responses</h2></div><Link className="text-link" href={`/submissions?form=${id}`}>View all enquiries</Link></div>
      {form.submissions.length ? <div className="wide-table"><Table><TableHeader><TableRow>{columns.map((field) => <TableHead key={field.id}>{field.labels.join(" / ")}</TableHead>)}<TableHead>Received</TableHead><TableHead>Enquiry</TableHead></TableRow></TableHeader><TableBody>{form.submissions.map((submission) => { const data = submission.data as Record<string, unknown>; return <TableRow key={submission.id}>{columns.map((field) => <TableCell key={field.id}>{valueLabel(data[field.id])}</TableCell>)}<TableCell><time>{submission.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</time></TableCell><TableCell><Link className="text-link" href={`/submissions/${submission.id}`}>Open enquiry</Link></TableCell></TableRow>; })}</TableBody></Table></div> : <div className="mini-empty"><p>No responses yet.</p><span>{canAdmin ? "Follow the setup guide to connect your website." : "They appear here once the form is on a website."}</span></div>}
    </Card>
    {canAdmin && <Card className="panel form-section" id="notifications"><div className="panel-header"><h2>Notifications and webhook</h2></div><FormConnections id={id} members={members.map(({ user }) => ({ name: user.name, email: user.email, verified: Boolean(user.emailVerifiedAt) }))} emails={form.notificationEmails} url={form.webhookUrl} hasSecret={Boolean(form.webhookSecret)} mailEnabled={mailConfigured()} />{deliveries.length > 0 && <div className="delivery-list"><h3>Recent deliveries</h3>{deliveries.map(job => <div key={job.id}><span>{job.kind.toLowerCase()}<small>{job.createdAt.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</small></span><span>{job.status.toLowerCase()}<small>{job.lastError}</small></span>{job.status === "FAILED" && <RetryDelivery id={job.id} />}</div>)}</div>}</Card>}
    {canAdmin && <section className="routing-section"><h2>Lead routing</h2><FormRouting id={id} updatedAt={form.updatedAt.toISOString()} mode={form.assignmentMode} defaultId={form.defaultAssigneeId} memberIds={form.assignmentMemberIds} minutes={form.unassignedAlertMinutes} members={assignees.map(member => member.user)} /></section>}
    <Card className="panel form-section"><div className="panel-header"><div><p className="eyebrow">Contract</p><h2>Accepted fields</h2></div><Link className="text-link" href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API" target="_blank">Fetch API <ExternalLink size={13} /></Link></div><div className="schema-list">{schema.fields.map((field) => <div key={field.id}><code>{field.id}</code><span>{field.type}</span><small>{field.required ? "required" : "optional"}</small></div>)}</div></Card>
  </div>;
}
