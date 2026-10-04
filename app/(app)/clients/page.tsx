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
    <section className="client-list"><div className="wide-table"><table><thead><tr><th>Client</th><th>Access</th><th>Forms</th><th>Enquiries</th><th>Unread</th><th>Unassigned</th><th>Overdue</th><th>Last received</th><th>Workspace</th></tr></thead><tbody>{clients.map(({ organization, role, counts }) => <tr key={organization.id}><td><strong>{organization.name}</strong>{organization.clientWebsite && <small>{organization.clientWebsite}</small>}</td><td>{role.toLowerCase()}</td><td>{organization._count.forms}</td><td>{counts.total}</td><td>{counts.unread}</td><td>{counts.unassigned}</td><td>{counts.overdue}</td><td>{counts.lastReceived?.toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" }) ?? "No enquiries"}</td><td><div className="header-actions"><form action={switchOrganization}><input name="organizationId" type="hidden" value={organization.id} /><button className="icon-button" title={`Open ${organization.name}`} aria-label={`Open ${organization.name}`}><FolderOpen size={17} /></button></form>{role === "OWNER" && <form action={switchOrganization}><input name="organizationId" type="hidden" value={organization.id} /><input name="destination" type="hidden" value="/settings" /><button className="icon-button" title={`Manage access for ${organization.name}`} aria-label={`Manage access for ${organization.name}`}><Users size={17} /></button></form>}</div></td></tr>)}</tbody></table></div>{!clients.length && <p className="quiet-note">No client workspaces yet.</p>}</section>
  </div>;
}
