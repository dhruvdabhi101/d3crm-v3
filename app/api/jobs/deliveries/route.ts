import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mailConfigured, mailJob, processDeliveries } from "@/lib/deliveries";
import { appUrl, safeEqual } from "@/lib/security";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32 || secret.startsWith("replace-with") || !safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (mailConfigured()) {
    const due = await db.submission.findMany({ where: { followUpAt: { lte: new Date() }, followUpNotifiedAt: null, status: { in: ["NEW", "CONTACTED", "QUALIFIED"] }, assignee: { emailVerifiedAt: { not: null } } }, include: { form: true, assignee: true }, take: 50 });
    for (const lead of due) {
      if (!lead.assignee || !lead.form.notificationEmails.includes(lead.assignee.email)) {
        await db.submission.updateMany({ where: { id: lead.id, updatedAt: lead.updatedAt, followUpNotifiedAt: null }, data: { followUpNotifiedAt: new Date() } });
        continue;
      }
      await db.$transaction(async tx => {
        const claimed = await tx.submission.updateMany({ where: { id: lead.id, updatedAt: lead.updatedAt, followUpNotifiedAt: null }, data: { followUpNotifiedAt: new Date() } });
        if (claimed.count) await tx.outboundDelivery.create({ data: { ...mailJob(lead.assignee!.email, `Follow-up due: ${lead.form.name}`, `An enquiry is due for follow-up.\n${appUrl()}/submissions/${lead.id}`, undefined, lead.formId), submissionId: lead.id } });
      });
    }
  }
  const result = await processDeliveries();
  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.accountToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.invitation.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.outboundDelivery.deleteMany({ where: { status: { in: ["SENT", "SKIPPED"] }, createdAt: { lt: new Date(Date.now() - 30 * 86400_000) } } });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
