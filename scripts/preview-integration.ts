import { createServer } from "node:http";
import { db } from "../lib/db.ts";
import { createFormKey } from "../lib/keys.ts";
import { websiteSnippet } from "../lib/forms/integration.ts";
import { parseFormSchema } from "../lib/forms/validate.ts";

const database = new URL(process.env.DATABASE_URL!);
const base = new URL(process.env.NEXTAUTH_URL!);
if (!["localhost", "127.0.0.1"].includes(database.hostname) || !database.pathname.endsWith("_test") || !["localhost", "127.0.0.1"].includes(base.hostname)) throw new Error("This preview requires a local test database and application.");
const owner = await db.user.findUniqueOrThrow({ where: { email: "owner@example.test" } });
const organization = await db.organization.findUniqueOrThrow({ where: { slug: "demo-agency" } });
const key = createFormKey();
const schema = { version: 1, fields: [{ id: "name", label: "Full name", type: "text", required: true }, { id: "email", label: "Email", type: "email", required: true }, { id: "message", label: "Message", type: "textarea", required: true }, { id: "quantity", label: "Quantity", type: "number", required: false }, { id: "consent", label: "Contact consent", type: "checkbox", required: true }] };
const form = await db.form.upsert({ where: { slug: "demo-wizard-preview" }, update: { keyHash: key.hash, keyPrefix: key.prefix, schema, status: "LIVE", allowedOrigins: ["http://localhost:3200"], assignmentMode: "DEFAULT", defaultAssigneeId: owner.id, notificationEmails: [] }, create: { name: "Local integration preview", slug: "demo-wizard-preview", organizationId: organization.id, schema, keyHash: key.hash, keyPrefix: key.prefix, allowedOrigins: ["http://localhost:3200"], assignmentMode: "DEFAULT", defaultAssigneeId: owner.id } });
createServer((request, response) => {
  const test = new URL(request.url ?? "/", "http://localhost:3200").searchParams.get("mode") !== "live";
  const code = websiteSnippet({ endpoint: `${base.origin}/api/v1/forms/${form.slug}/submissions`, key: key.key, name: form.name, schema: parseFormSchema(schema), formId: "preview-contact", format: "html", test });
  response.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store" });
  response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local form integration</title><style>body{font:16px system-ui;margin:40px auto;max-width:650px;padding:0 24px}form{display:grid;gap:20px}label{display:grid;gap:8px}input,textarea,button{font:inherit;padding:10px}input[type=checkbox]{width:20px;height:20px}nav{display:flex;gap:24px;margin-bottom:30px}textarea{min-height:90px}</style><nav><a href="/?mode=test">Test mode</a><a href="/?mode=live">Live mode</a></nav><h1>${test ? "Test connection" : "Send local enquiry"}</h1>${code}</html>`);
}).listen(3200, "127.0.0.1", () => console.log("Local integration fixture: http://localhost:3200 (dummy-data test database only)."));
