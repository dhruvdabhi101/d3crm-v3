import { hash } from "bcryptjs";
import { db } from "../lib/db.ts";
import { createFormKey } from "../lib/keys.ts";

const url = new URL(process.env.DATABASE_URL!);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !url.pathname.endsWith("_test")) throw new Error("Demo data requires a local test database.");
try {
  const passwordHash = await hash("DemoPassword2026!", 12);
  const org = await db.organization.upsert({ where: { slug: "demo-agency" }, update: {}, create: { name: "Demo Agency", slug: "demo-agency" } });
  for (const [name, email, role] of [["Demo Owner", "owner@example.test", "OWNER"], ["Demo Teammate", "member@example.test", "MEMBER"], ["Demo Viewer", "viewer@example.test", "VIEWER"]] as const) {
    const user = await db.user.upsert({ where: { email }, update: { passwordHash, emailVerifiedAt: new Date() }, create: { name, email, passwordHash, emailVerifiedAt: new Date() } });
    await db.organizationMember.upsert({ where: { userId_organizationId: { userId: user.id, organizationId: org.id } }, update: { role }, create: { userId: user.id, organizationId: org.id, role } });
  }
  const schema = { version: 1, fields: [{ id: "name", label: "Full name", type: "text", required: true, maxLength: 120 }, { id: "email", label: "Email", type: "email", required: true }, { id: "message", label: "Message", type: "textarea", required: true, maxLength: 3000 }] };
  const key = createFormKey();
  const form = await db.form.upsert({ where: { slug: "demo-contact" }, update: {}, create: { name: "Website enquiries", slug: "demo-contact", organizationId: org.id, schema, keyPrefix: key.prefix, keyHash: key.hash } });
  if (!await db.submission.count({ where: { formId: form.id } })) {
    await db.submission.createMany({ data: Array.from({ length: 32 }, (_, index) => ({ formId: form.id, schemaSnapshot: schema, data: { name: ["Alex Morgan", "Priya Shah", "Sam Patel", "Jordan Lee"][index % 4], email: `enquiry${index + 1}@example.test`, message: index === 0 ? "We need a website for our new studio. Can you share your availability and a quote?" : `Enquiry ${index + 1}: Please share details about your services.` }, status: index % 5 === 0 ? "CONTACTED" : "NEW", createdAt: new Date(Date.now() - index * 3600_000) })) });
  }
  const reportingKey = createFormKey();
  const reportingForm = await db.form.upsert({ where: { slug: "demo-reporting" }, update: {}, create: { name: "Campaign enquiries", slug: "demo-reporting", organizationId: org.id, schema, keyPrefix: reportingKey.prefix, keyHash: reportingKey.hash } });
  if (!await db.submission.count({ where: { formId: reportingForm.id } })) {
    const owner = await db.user.findUniqueOrThrow({ where: { email: "owner@example.test" } });
    for (const [index, status] of (["WON", "QUALIFIED", "CONTACTED", "NEW", "LOST", "SPAM"] as const).entries()) {
      const createdAt = new Date(Date.now() - (index + 1) * 86400_000);
      await db.$transaction(async tx => {
        const lead = await tx.submission.create({ data: { formId: reportingForm.id, schemaSnapshot: schema, data: { name: `Demo prospect ${index + 1}`, email: `campaign${index + 1}@example.test`, message: "Demo enquiry about a website project." }, attribution: { landing_page: "https://demo.example.test/contact", utm_source: index % 2 ? "linkedin" : "google", utm_medium: "paid", utm_campaign: "Studio launch" }, status, createdAt, assigneeId: owner.id, followUpAt: status === "QUALIFIED" ? new Date(Date.now() - 86400_000) : null, firstContactedAt: ["WON", "CONTACTED", "QUALIFIED"].includes(status) ? new Date(createdAt.getTime() + 2 * 3600_000) : null } });
        await tx.activity.create({ data: { organizationId: org.id, submissionId: lead.id, subjectId: lead.id, action: "lead.created", createdAt } });
        if (status !== "NEW") await tx.activity.create({ data: { organizationId: org.id, actorId: owner.id, submissionId: lead.id, subjectId: lead.id, action: "lead.updated", createdAt: new Date(createdAt.getTime() + 2 * 3600_000), details: { previousStatus: "NEW", status } } });
      });
    }
  }
  console.log("Local demo ready: owner@example.test / DemoPassword2026!");
} finally { await db.$disconnect(); }
