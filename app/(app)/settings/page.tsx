
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";
import { Role } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { AddMemberForm, InviteMemberForm, RemoveMemberForm, OrganizationNameForm, TransferOwnershipForm } from "@/components/organization-settings-forms";
import { db } from "@/lib/db";
import { getCurrentContext } from "@/lib/permissions";
import { AccountForm } from "@/components/account-form";
import { cancelInvitation } from "@/lib/actions/organization";
import { Mail, X } from "lucide-react";
import Link from "next/link";
import { BillingControls } from "@/components/billing-controls";
import { billingConfigured, monthStart, planLimits } from "@/lib/billing";

export default async function SettingsPage() {
  const { organization, membership, user } = await getCurrentContext();
  const members = await db.organizationMember.findMany({ where: { organizationId: organization.id }, include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } });
  const canAdmin = membership.role === Role.OWNER || membership.role === Role.ADMIN;
  const isOwner = membership.role === Role.OWNER;
  const invitations = isOwner ? await db.invitation.findMany({ where: { organizationId: organization.id, expiresAt: { gt: new Date() } }, orderBy: { expiresAt: "asc" } }) : [];
  const formUsage = await db.form.count({ where: { organizationId: organization.id, status: { not: "ARCHIVED" } } });
  const submissionUsage = organization.usageMonth >= monthStart() ? organization.monthlySubmissions : 0;
  const limits = planLimits(organization.plan);
  return <div className="page page-narrow"><PageHeader eyebrow="Workspace" title="Settings" description="Organization details and who can access collected data." action={<Button asChild variant="outline"><Link className="button button-secondary" href="/templates"><Mail size={16} />Reply templates</Link></Button>} />
    <Card className="panel form-section"><div className="section-heading"><span className="step">1</span><div><h2>Organization</h2><p>This name appears throughout your workspace.</p></div></div><OrganizationNameForm name={organization.name} canAdmin={canAdmin} /></Card>
    <Card className="panel form-section"><div className="section-heading"><span className="step">2</span><div><h2>Members</h2><p>Owners control access; viewers can read and export without changing forms.</p></div></div><div className="member-list">{members.map((item) => <div className="member-row" key={item.id}><span className="avatar">{item.user.name.slice(0, 1).toUpperCase()}</span><span><strong>{item.user.name}</strong><small>{item.user.email}</small></span><em>{item.role.toLowerCase()}</em></div>)}</div>{isOwner && <><InviteMemberForm />{invitations.length > 0 && <div className="pending-invitations">{invitations.map(invitation => <div key={invitation.id}><span>{invitation.email}<small>{invitation.role.toLowerCase()} · Pending</small></span><form action={cancelInvitation}><input type="hidden" name="id" value={invitation.id} /><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="icon-button" aria-label={`Cancel invitation for ${invitation.email}`}><X size={16} /></Button></TooltipTrigger><TooltipContent>{"Cancel invitation"}</TooltipContent></Tooltip></form></div>)}</div>}<AddMemberForm /><RemoveMemberForm members={members.filter(item => item.id !== membership.id).map(item => ({ id: item.id, name: item.user.name }))} /><TransferOwnershipForm members={members.filter((item) => item.id !== membership.id).map((item) => ({ id: item.id, name: item.user.name, email: item.user.email }))} /></>}</Card>
    <Card className="panel form-section"><div className="section-heading"><span className="step">3</span><div><h2>Account</h2><p>{user.email}</p></div></div><div className="connection-form">{user.emailVerifiedAt ? <Alert className="form-success"><AlertDescription>Email verified</AlertDescription></Alert> : <AccountForm action="verification-request" />}</div></Card>
    <Card className="panel form-section"><div className="section-heading"><span className="step">4</span><div><h2>Subscription</h2><p>{billingConfigured() ? `${organization.plan === "PRO" ? "Pro" : "Free"} plan${organization.subscriptionStatus ? ` · ${organization.subscriptionStatus}` : ""}` : "Billing is not enabled for this workspace."}</p></div></div><div className="connection-form"><p>{formUsage} {billingConfigured() ? `/ ${limits.forms}` : ""} active forms · {submissionUsage} {billingConfigured() ? `/ ${limits.submissions}` : ""} submissions this month</p>{billingConfigured() && isOwner && <BillingControls portal={Boolean(organization.stripeCustomerId && organization.stripeSubscriptionId)} />}</div></Card>
    <Card className="panel form-section"><div className="section-heading"><div><h2>Privacy and legal</h2><p>Read the <Link href="/privacy">Privacy Policy</Link>, <Link href="/terms">Terms of Service</Link>, and <Link href="/data-processing">Data Processing Agreement</Link>. To request access, correction, deletion, account closure, or withdrawal of account consent, use the <Link href="/privacy#contact">privacy contact</Link>.</p></div></div></Card>
  </div>;
}
