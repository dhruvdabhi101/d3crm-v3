"use server";

import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { after } from "next/server";
import { z } from "zod";
import { mailConfigured, mailJob, processDeliveries } from "@/lib/deliveries";
import { appUrl, randomToken, tokenHash } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";

export type OrganizationActionState = { error?: string; success?: string };

export async function inviteMember(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const { organization, user } = await requireRole(Role.OWNER);
  if (!user.emailVerifiedAt) return { error: "Verify your email before inviting teammates." };
  if (!mailConfigured()) return { error: "Email delivery is not configured. Contact the administrator." };
  const email = z.string().trim().email().max(254).transform(value => value.toLowerCase()).safeParse(formData.get("email"));
  const role = String(formData.get("role")) as Role;
  if (!email.success || ![Role.ADMIN, Role.MEMBER, Role.VIEWER].includes(role as "ADMIN" | "MEMBER" | "VIEWER")) return { error: "Enter a valid email and role." };
  if (await db.organizationMember.findFirst({ where: { organizationId: organization.id, user: { email: email.data } } })) return { error: "That person is already a member." };
  await rateLimit("invitation-owner", user.id, 20, 3600);
  const token = randomToken(); const hashed = tokenHash(token); const expiresAt = new Date(Date.now() + 7 * 86400_000);
  await db.$transaction(async tx => {
    await tx.invitation.upsert({ where: { organizationId_email: { organizationId: organization.id, email: email.data } }, create: { organizationId: organization.id, email: email.data, role, tokenHash: hashed, expiresAt }, update: { role, tokenHash: hashed, expiresAt } });
    await tx.outboundDelivery.create({ data: mailJob(email.data, `Join ${organization.name} on d3CRM`, `${user.name} invited you to ${organization.name} as ${role.toLowerCase()}.\n\nAccept your invitation:\n${appUrl()}/invitations?token=${token}\n\nThis link expires in 7 days.`, hashed) });
  });
  after(async () => { await processDeliveries(); }); revalidatePath("/settings");
  return { success: "Invitation queued." };
}

export async function cancelInvitation(formData: FormData) {
  const { organization } = await requireRole(Role.OWNER);
  await db.invitation.deleteMany({ where: { id: String(formData.get("id")), organizationId: organization.id } });
  revalidatePath("/settings");
}

export async function removeMember(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const { organization, user } = await requireRole(Role.OWNER);
  const id = String(formData.get("memberId"));
  const removed = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organization.id} FOR UPDATE`;
    const actor = await tx.organizationMember.findFirst({ where: { organizationId: organization.id, userId: user.id, role: "OWNER" } });
    if (!actor) return false;
    const target = await tx.organizationMember.findFirst({ where: { id, organizationId: organization.id, role: { not: "OWNER" } } });
    if (!target) return false;
    await tx.submission.updateMany({ where: { assigneeId: target.userId, form: { organizationId: organization.id } }, data: { assigneeId: null } });
    await tx.organizationMember.delete({ where: { id } });
    return true;
  });
  revalidatePath("/settings"); revalidatePath("/submissions");
  return removed ? { success: "Member removed." } : { error: "Choose a current member other than the owner." };
}

export async function acceptInvitation(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) return { error: "Sign in to accept your invitation." };
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.sessionVersion !== session.user.sessionVersion) return { error: "Sign in again to continue." };
  const token = String(formData.get("token") ?? "");
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { error: "This invitation is invalid or expired." };
  const organizationId = await db.$transaction(async tx => {
    const invitation = await tx.invitation.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!invitation || invitation.email !== user.email || invitation.expiresAt <= new Date()) return null;
    const existing = await tx.organizationMember.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: invitation.organizationId } } });
    if (existing) return null;
    const consumed = await tx.invitation.deleteMany({ where: { id: invitation.id, tokenHash: invitation.tokenHash, expiresAt: { gt: new Date() } } });
    if (!consumed.count) return null;
    await tx.organizationMember.create({ data: { organizationId: invitation.organizationId, userId: user.id, role: invitation.role } });
    await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    return invitation.organizationId;
  });
  if (!organizationId) return { error: "This invitation is invalid, expired, or belongs to another email address." };
  (await cookies()).set("d3crm-organization", organizationId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 365 * 86400 });
  redirect("/dashboard");
}

const duplicateName = "An organization with that name already exists.";

export async function updateOrganization(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const { organization } = await requireRole(Role.ADMIN);
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 100) return { error: "Use an organization name between 2 and 100 characters." };
  try {
    await db.organization.update({ where: { id: organization.id }, data: { name } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: duplicateName };
    throw error;
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: "Organization renamed." };
}

export async function addMember(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const { organization, user: actor } = await requireRole(Role.OWNER);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const requestedRole = String(formData.get("role") ?? "VIEWER");
  const allowedRoles: Role[] = [Role.ADMIN, Role.MEMBER, Role.VIEWER];
  if (!allowedRoles.includes(requestedRole as Role)) return { error: "Choose a valid role." };
  const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } });
  if (!user) return { error: "That person needs to create a d3CRM account first." };
  if (!user.emailVerifiedAt) return { error: "That person needs to verify their email first. You can also send an invitation." };
  const result = await db.$transaction(async tx => {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organization.id} FOR UPDATE`;
  if (!await tx.organizationMember.findFirst({ where: { organizationId: organization.id, userId: actor.id, role: "OWNER" } })) return { error: "Only the current owner can manage members." };
  const existingMembership = await tx.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    select: { role: true },
  });
  if (existingMembership?.role === Role.OWNER) return { error: "Use Transfer ownership to change the owner." };
  await tx.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: { role: requestedRole as Role },
    create: { userId: user.id, organizationId: organization.id, role: requestedRole as Role },
  });
  return { success: existingMembership ? "Member role updated." : "Member added." };
  });
  revalidatePath("/settings");
  return result;
}

export async function transferOwnership(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const { organization, membership } = await requireRole(Role.OWNER);
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId || memberId === membership.id) return { error: "Choose another member to become owner." };
  const target = await db.organizationMember.findFirst({ where: { id: memberId, organizationId: organization.id } });
  if (!target) return { error: "Choose an existing member of this organization." };
  try {
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organization.id} FOR UPDATE`;
      const current = await tx.organizationMember.updateMany({ where: { id: membership.id, organizationId: organization.id, role: Role.OWNER }, data: { role: Role.ADMIN } });
      if (!current.count) throw new Error("Ownership has changed. Refresh the page and try again.");
      await tx.organizationMember.update({ where: { id: target.id }, data: { role: Role.OWNER } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Ownership has changed. Refresh the page and try again." };
    if (error instanceof Error && error.message.startsWith("Ownership has changed.")) return { error: error.message };
    throw error;
  }
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: "Ownership transferred. You are now an admin." };
}

export async function switchOrganization(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user.id) redirect("/sign-in");
  const current = await db.user.findUnique({ where: { id: session.user.id }, select: { sessionVersion: true } });
  if (!current || current.sessionVersion !== session.user.sessionVersion) redirect("/sign-in");
  const organizationId = String(formData.get("organizationId") ?? "");
  const membership = await db.organizationMember.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId } },
    select: { id: true },
  });
  if (!membership) throw new Error("You do not have access to that organization.");
  (await cookies()).set("d3crm-organization", organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/dashboard");
}
