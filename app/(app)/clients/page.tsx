
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FolderOpen, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ClientWorkspaceForm } from "@/components/client-workspace-form";
import { getCurrentContext } from "@/lib/permissions";
import { clientWorkspaces } from "@/lib/workspaces";
import { switchOrganization } from "@/lib/actions/organization";

export default async function ClientsPage() {
  const { user, membership } = await getCurrentContext();
  const clients = await clientWorkspaces(user.id);
  const canCreate = ["OWNER", "ADMIN"].includes(membership.role);
  return <div className="page"><PageHeader title="Clients" description={`${clients.length} client workspace${clients.length === 1 ? "" : "s"}`} />
    {canCreate && <section className="client-create-section"><h2>New client</h2><ClientWorkspaceForm /></section>}
    <section className="client-list"><div className="wide-table"><Table><TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Access</TableHead><TableHead>Forms</TableHead><TableHead>Enquiries</TableHead><TableHead>Unread</TableHead><TableHead>Unassigned</TableHead><TableHead>Overdue</TableHead><TableHead>Last received</TableHead><TableHead>Workspace</TableHead></TableRow></TableHeader><TableBody>{clients.map(({ organization, role, counts }) => <TableRow key={organization.id}><TableCell><strong>{organization.name}</strong>{organization.clientWebsite && <small>{organization.clientWebsite}</small>}</TableCell><TableCell>{role.toLowerCase()}</TableCell><TableCell>{organization._count.forms}</TableCell><TableCell>{counts.total}</TableCell><TableCell>{counts.unread}</TableCell><TableCell>{counts.unassigned}</TableCell><TableCell>{counts.overdue}</TableCell><TableCell>{counts.lastReceived?.toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" }) ?? "No enquiries"}</TableCell><TableCell><div className="header-actions"><form action={switchOrganization}><input name="organizationId" type="hidden" value={organization.id} /><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" aria-label={`Open ${organization.name}`}><FolderOpen size={17} /></Button></TooltipTrigger><TooltipContent>{`Open ${organization.name}`}</TooltipContent></Tooltip></form>{role === "OWNER" && <form action={switchOrganization}><input name="organizationId" type="hidden" value={organization.id} /><input name="destination" type="hidden" value="/settings" /><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" aria-label={`Manage access for ${organization.name}`}><Users size={17} /></Button></TooltipTrigger><TooltipContent>{`Manage access for ${organization.name}`}</TooltipContent></Tooltip></form>}</div></TableCell></TableRow>)}</TableBody></Table></div>{!clients.length && <p className="quiet-note">No client workspaces yet.</p>}</section>
  </div>;
}
