import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ReplyTemplateManager } from "@/components/reply-template-manager";
import { getCurrentContext } from "@/lib/permissions";
import { db } from "@/lib/db";

export default async function TemplatesPage() {
  const { organization, membership } = await getCurrentContext();
  const templates = await db.replyTemplate.findMany({ where: { organizationId: organization.id }, orderBy: [{ name: "asc" }, { id: "asc" }] });
  return <div className="page"><Link className="text-link" href="/submissions"><ArrowLeft size={16} />Inbox</Link><PageHeader eyebrow="Workspace" title="Reply templates" description={organization.name} /><ReplyTemplateManager canAdmin={membership.role === "OWNER" || membership.role === "ADMIN"} templates={templates.map(template => ({ id: template.id, name: template.name, subject: template.subject, body: template.body, updatedAt: template.updatedAt.toISOString() }))} /></div>;
}
