import { Role } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { addMember, updateOrganization } from "@/lib/actions/organization";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";

export default async function SettingsPage() {
  const { organization, membership } = await getCurrentContext();
  const members = await db.organizationMember.findMany({ where: { organizationId: organization.id }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } });
  const canAdmin = membership.role === Role.OWNER || membership.role === Role.ADMIN;
  const isOwner = membership.role === Role.OWNER;
  return <div className="page page-narrow"><PageHeader eyebrow="Workspace" title="Settings" description="Organization details and who can access collected data." />
    <section className="panel form-section"><div className="section-heading"><span className="step">1</span><div><h2>Organization</h2><p>This name appears throughout your workspace.</p></div></div><form action={updateOrganization} className="settings-form"><label className="field"><span>Name</span><input name="name" defaultValue={organization.name} disabled={!canAdmin} minLength={2} maxLength={100} /></label>{canAdmin && <button className="button button-primary">Save changes</button>}</form></section>
    <section className="panel form-section"><div className="section-heading"><span className="step">2</span><div><h2>Members</h2><p>Owners control access; viewers can read and export without changing forms.</p></div></div><div className="member-list">{members.map((item) => <div className="member-row" key={item.id}><span className="avatar">{item.user.name.slice(0, 1).toUpperCase()}</span><span><strong>{item.user.name}</strong><small>{item.user.email}</small></span><em>{item.role.toLowerCase()}</em></div>)}</div>{isOwner && <form action={addMember} className="invite-form"><label className="field"><span>Existing user email</span><input name="email" type="email" placeholder="teammate@company.com" required /></label><label className="field"><span>Role</span><select name="role" defaultValue="VIEWER"><option value="VIEWER">Viewer</option><option value="MEMBER">Member</option><option value="ADMIN">Admin</option></select></label><button className="button button-secondary">Add member</button></form>}</section>
  </div>;
}
