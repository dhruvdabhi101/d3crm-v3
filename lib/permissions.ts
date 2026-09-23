import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const rank: Record<Role, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

export async function getCurrentContext() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/sign-in");
  const organizationId = (await cookies()).get("d3crm-organization")?.value;
  let membership = await db.organizationMember.findFirst({
    where: { userId: session.user.id, ...(organizationId ? { organizationId } : {}) },
    include: { organization: true, user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!membership && organizationId) {
    membership = await db.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true, user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
  }
  if (!membership) redirect("/sign-in?error=organization");
  return { session, membership, organization: membership.organization, user: membership.user };
}

export async function requireRole(minimum: Role) {
  const context = await getCurrentContext();
  if (rank[context.membership.role] < rank[minimum]) redirect("/dashboard");
  return context;
}
