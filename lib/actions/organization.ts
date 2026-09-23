"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/permissions";

export async function updateOrganization(formData: FormData) {
  const { organization } = await requireRole(Role.ADMIN);
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 100) throw new Error("Use an organization name between 2 and 100 characters.");
  await db.organization.update({ where: { id: organization.id }, data: { name } });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function addMember(formData: FormData) {
  const { organization } = await requireRole(Role.OWNER);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const requestedRole = String(formData.get("role") ?? "VIEWER");
  const allowedRoles: Role[] = [Role.ADMIN, Role.MEMBER, Role.VIEWER];
  if (!allowedRoles.includes(requestedRole as Role)) throw new Error("Invalid role.");
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error("That person needs to create a d3CRM account first.");
  const existingMembership = await db.organizationMember.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    select: { role: true },
  });
  if (existingMembership?.role === Role.OWNER) throw new Error("The organization owner’s role cannot be changed here.");
  await db.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: { role: requestedRole as Role },
    create: { userId: user.id, organizationId: organization.id, role: requestedRole as Role },
  });
  revalidatePath("/settings");
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
