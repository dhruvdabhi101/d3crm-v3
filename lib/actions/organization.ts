"use server";

import { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

export type OrganizationActionState = { error?: string; success?: string };

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
  const { organization } = await requireRole(Role.OWNER);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const requestedRole = String(formData.get("role") ?? "VIEWER");
  const allowedRoles: Role[] = [Role.ADMIN, Role.MEMBER, Role.VIEWER];
  if (!allowedRoles.includes(requestedRole as Role)) return { error: "Choose a valid role." };
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { error: "That person needs to create a d3CRM account first." };
  const existingMembership = await db.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    select: { role: true },
  });
  if (existingMembership?.role === Role.OWNER) return { error: "Use Transfer ownership to change the owner." };
  await db.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: { role: requestedRole as Role },
    create: { userId: user.id, organizationId: organization.id, role: requestedRole as Role },
  });
  revalidatePath("/settings");
  return { success: existingMembership ? "Member role updated." : "Member added." };
}

export async function transferOwnership(_state: OrganizationActionState, formData: FormData): Promise<OrganizationActionState> {
  const { organization, membership } = await requireRole(Role.OWNER);
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId || memberId === membership.id) return { error: "Choose another member to become owner." };
  const target = await db.organizationMember.findFirst({ where: { id: memberId, organizationId: organization.id } });
  if (!target) return { error: "Choose an existing member of this organization." };
  try {
    await db.$transaction(async (tx) => {
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
