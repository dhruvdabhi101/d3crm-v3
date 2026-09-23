import { AppShell } from "@/components/app-shell";
import { getCurrentContext } from "@/lib/permissions";
import { db } from "@/lib/db";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { organization, user } = await getCurrentContext();
  const memberships = await db.organizationMember.findMany({ where: { userId: user.id }, include: { organization: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } });
  const organizations = memberships.map((item) => ({ id: item.organization.id, name: item.organization.name, role: item.role }));
  return <AppShell organizationId={organization.id} organizations={organizations} user={user}>{children}</AppShell>;
}
