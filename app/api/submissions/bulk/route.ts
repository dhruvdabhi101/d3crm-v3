import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { bulkSaveLeads } from "@/lib/lead-workflow";
import { getCurrentContext } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { readJson, requireSameOrigin, RequestError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (!(await getServerSession(authOptions))?.user?.id) throw new RequestError("Sign in to continue.", 401);
    const { organization, user, membership } = await getCurrentContext();
    if (membership.role === Role.VIEWER) throw new RequestError("You do not have enquiry write access.", 403);
    const input = await readJson(request, 12000);
    await rateLimit("lead-bulk", user.id, 120, 3600);
    const count = await db.$transaction(tx => bulkSaveLeads(tx, organization.id, user.id, input), { timeout: 15000 });
    // A JSON response keeps mutation completion independent of React's action transition.
    revalidatePath("/submissions");
    revalidatePath("/submissions/[id]", "page");
    revalidatePath("/forms/[id]", "page");
    for (const path of ["/dashboard", "/follow-ups", "/reports", "/clients", "/activity"]) revalidatePath(path);
    return NextResponse.json({ success: `Saved ${count} ${count === 1 ? "enquiry" : "enquiries"}.` });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    throw error;
  }
}
