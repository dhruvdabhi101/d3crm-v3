import { AppShell } from "@/components/app-shell";
import { getCurrentContext } from "@/lib/permissions";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { organization, user, membership } = await getCurrentContext();
  const memberships = await db.organizationMember.findMany({ where: { userId: user.id }, include: { organization: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } });
  const organizations = memberships.map((item) => ({ id: item.organization.id, name: item.organization.name, role: item.role }));
  return <AppShell organizationId={organization.id} organizations={organizations} user={user} canAdmin={["OWNER", "ADMIN"].includes(membership.role)}>{!user.emailVerifiedAt && <div className="verification-banner">Your email is not verified. <Link href="/settings">Verify email</Link></div>}{children}</AppShell>;
}
