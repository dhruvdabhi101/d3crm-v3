import { hash } from "bcryptjs";
import { db } from "../lib/db.ts";
import { createFormKey } from "../lib/keys.ts";
import { primaryContactEmail } from "../lib/forms/contact.ts";

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
  const owner = await db.user.findUniqueOrThrow({ where: { email: "owner@example.test" } });
  const followUpKey = createFormKey();
  const followUpForm = await db.form.upsert({ where: { slug: "demo-followups" }, update: {}, create: { name: "Studio consultations", slug: "demo-followups", organizationId: org.id, schema, keyPrefix: followUpKey.prefix, keyHash: followUpKey.hash } });
  if (!await db.submission.count({ where: { formId: followUpForm.id } })) {
    const day = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    for (const [index, offset] of [-2, 0, 0, 1, 3, 7, 10].entries()) {
      const data = { name: ["Avery Brooks", "Morgan Chen", "Riley Singh", "Jamie Parker", "Casey Reed", "Taylor Evans", "Sam Rivera"][index], email: index < 2 ? "studio@example.test" : `consultation${index}@example.test`, message: "We are planning a website project and would like to discuss timing and next steps." };
      await db.submission.create({ data: { formId: followUpForm.id, data, schemaSnapshot: schema, contactEmail: primaryContactEmail(schema, data), status: index % 3 === 0 ? "QUALIFIED" : "NEW", assigneeId: index % 2 === 0 ? owner.id : null, followUpAt: new Date(day.getTime() + offset * 86400_000) } });
    }
  }
  await db.replyTemplate.upsert({ where: { organizationId_name: { organizationId: org.id, name: "Studio follow-up" } }, update: {}, create: { organizationId: org.id, name: "Studio follow-up", subject: "Next steps for your project", body: "Hi {{name}},\n\nThanks for getting in touch with {{workspace_name}}. Could you share a little more about your project and the timing you have in mind?\n\nBest,\n{{sender_name}}" } });
  console.log("Local demo ready: owner@example.test / DemoPassword2026!");
} finally { await db.$disconnect(); }
