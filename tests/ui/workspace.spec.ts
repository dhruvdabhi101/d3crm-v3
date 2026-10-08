import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";

const dbUrl = new URL(process.env.DATABASE_URL ?? "http://missing");
const base = process.env.NEXTAUTH_URL ?? "http://missing";
if (!["localhost", "127.0.0.1"].includes(dbUrl.hostname) || !dbUrl.pathname.endsWith("_test") || !["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("UI checks require an isolated local test database and server.");
const db = new PrismaClient();
const suffix = randomUUID();
const email = `ui-${suffix}@example.test`;
let teammateId: string, userId: string, orgId: string, formId: string, firstLead: string, secondLead: string, token: string;
const schema = { version: 1, fields: [{ id: "name", label: "Name", type: "text", required: true }, { id: "email", label: "Email", type: "email", required: true }, { id: "message", label: "Message", type: "textarea", required: true }] };

test.beforeAll(async () => {
  const user = await db.user.create({ data: { name: "Alex Morgan", email, passwordHash: await hash("UI-Test-Password2026!", 12), emailVerifiedAt: new Date() } });
  userId = user.id;
  const org = await db.organization.create({ data: { name: `Fieldwork ${suffix}`, slug: `ui-${suffix}`, members: { create: { userId, role: "OWNER" } } } });
  orgId = org.id;
  const teammate = await db.user.create({ data: { name: "Jamie Lane", email: `teammate-${suffix}@example.test`, passwordHash: "test-only-unused", emailVerifiedAt: new Date(), memberships: { create: { organizationId: orgId, role: "MEMBER" } } } });
  teammateId = teammate.id;
  const form = await db.form.create({ data: { name: "Website enquiries", slug: `ui-form-${suffix}`, organizationId: orgId, schema, keyHash: randomUUID(), keyPrefix: "ui-fixture", allowedOrigins: ["https://example.test"] } });
  formId = form.id;
  const leads = await Promise.all(["Maya Reynolds", "Jordan Lee"].map(name => db.submission.create({ data: { formId, schemaSnapshot: schema, data: { name, email: "lead@example.test", message: "A website for our next chapter." }, contactEmail: "lead@example.test" } })));
  [firstLead, secondLead] = leads.map(lead => lead.id);
  token = await encode({ token: { id: userId, sessionVersion: user.sessionVersion, name: user.name, email }, secret: process.env.NEXTAUTH_SECRET!, maxAge: 3600 });
});
test.afterAll(async () => { if (orgId) await db.organization.delete({ where: { id: orgId } }); if (teammateId) await db.user.delete({ where: { id: teammateId } }); if (userId) await db.user.delete({ where: { id: userId } }); await db.$disconnect(); });

test("public mobile navigation, disclosure, and checklist remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A first hello.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "d3CRM" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await page.getByRole("button", { name: "Does this replace my website?" }).click();
  await expect(page.getByText("Your website stays yours.", { exact: false })).toBeVisible();
  await page.goto("/tools/form-launch-checklist");
  await page.getByRole("checkbox").first().check();
  await expect(page.getByRole("status")).toContainText("1 of");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
});

test("sign-in uses real authentication and redirects signed-in auth pages", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("UI-Test-Password2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  for (const path of ["/sign-in", "/sign-up"]) { await page.goto(path); await expect(page).toHaveURL(/\/dashboard$/); }
});

test.describe("authenticated workspace", () => {
  test.beforeEach(async ({ context }) => { await context.addCookies([{ name: "next-auth.session-token", value: token, url: base, httpOnly: true, sameSite: "Lax" }]); });

  test("overview cards keep equal insets and search focus stays inside its header", async ({ page }, testInfo) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
      await expect(page.locator(".inbox-panel .list-row").first()).toBeVisible();
      const insets = await page.locator(".stat-card").evaluateAll(cards => cards.map(card => getComputedStyle(card).paddingLeft));
      expect(insets).toHaveLength(3);
      expect(new Set(insets).size).toBe(1);
      expect(parseFloat(insets[0])).toBeGreaterThan(0);
      const rowInset = await page.locator(".inbox-panel .list-row").first().evaluate(row => parseFloat(getComputedStyle(row).paddingLeft));
      expect(rowInset).toBeGreaterThan(0);
      await page.keyboard.press("ControlOrMeta+k");
      const input = page.getByRole("combobox", { name: "Search enquiries and forms" });
      await expect(input).toBeFocused();
      await expect(input).toHaveCSS("outline-style", "none");
      await expect(input).toHaveCSS("box-shadow", "none");
      const inputBox = await input.boundingBox();
      const headerBox = await page.locator('[data-slot="command-input-wrapper"]').boundingBox();
      expect(inputBox).not.toBeNull();
      expect(headerBox).not.toBeNull();
      expect(inputBox!.y).toBeGreaterThanOrEqual(headerBox!.y);
      expect(inputBox!.y + inputBox!.height).toBeLessThanOrEqual(headerBox!.y + headerBox!.height);
      await page.screenshot({ path: testInfo.outputPath(`search-${width}.png`) });
      await page.keyboard.press("Escape");
      await page.screenshot({ path: testInfo.outputPath(`overview-${width}.png`) });
    }
  });

  test("all work screens render and search supports keyboard selection", async ({ page }) => {
    for (const path of ["/dashboard", "/submissions", "/follow-ups", "/forms", "/reports", "/clients", "/templates", "/activity", "/settings"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.keyboard.press("ControlOrMeta+k");
    await expect(page.getByRole("dialog", { name: "Search workspace" })).toBeVisible();
    await page.getByRole("combobox", { name: "Search enquiries and forms" }).fill("Maya");
    await expect(page.getByRole("option").filter({ hasText: "Maya Reynolds" })).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/submissions/${firstLead}$`));
  });

  test("collapsed form settings and tab switches keep values on save", async ({ page }) => {
    await page.goto(`/forms/${formId}/edit`);
    await page.getByRole("tab", { name: "Build with AI" }).click();
    await page.getByRole("tab", { name: "Form editor" }).click();
    await page.getByRole("button", { name: "Website access Optional" }).click();
    await page.getByLabel("Allowed website origins").fill("https://example.test\nhttps://studio.example.test");
    await page.getByRole("button", { name: "Website access Optional" }).click();
    await page.locator(".field-row").first().getByRole("checkbox", { name: "Required" }).uncheck();
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Form updated." })).toBeVisible({ timeout: 10000 });
    const saved = await db.form.findUniqueOrThrow({ where: { id: formId } });
    expect(saved.allowedOrigins).toEqual(["https://example.test", "https://studio.example.test"]);
    expect((saved.schema as typeof schema).fields[0].required).toBe(false);
  });

  test("checkbox selection supports partial selection and bulk updates", async ({ page }) => {
    await page.goto("/submissions");
    await page.getByRole("checkbox", { name: "Select enquiry Maya Reynolds" }).check();
    await expect(page.getByRole("checkbox", { name: "Select all enquiries on this page" })).toHaveAttribute("data-state", "indeterminate");
    await page.getByRole("checkbox", { name: "Select all enquiries on this page" }).check();
    await expect(page.getByText("2 selected", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect.poll(async () => db.submission.count({ where: { formId, status: "CONTACTED" } })).toBe(2);
  });

  test("reply confirmation cancellation preserves edits and confirmation resets them", async ({ page }) => {
    await page.goto(`/submissions/${firstLead}`);
    const draft = page.getByRole("region", { name: "Reply draft" });
    await draft.getByLabel("Subject", { exact: true }).fill("Keep my edited subject");
    await draft.getByRole("button", { name: "Reset draft" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(draft.getByRole("button", { name: "Reset draft" })).toBeFocused();
    await expect(draft.getByLabel("Subject", { exact: true })).toHaveValue("Keep my edited subject");
    await draft.getByRole("button", { name: "Reset draft" }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(draft.getByLabel("Subject", { exact: true })).not.toHaveValue("Keep my edited subject");
    await page.getByRole("checkbox", { name: "Mark unread" }).check();
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect.poll(async () => (await db.submission.findUniqueOrThrow({ where: { id: firstLead } })).readAt).toBe(null);
  });

  test("routing checkboxes still submit named values", async ({ page }) => {
    await page.goto(`/forms/${formId}`);
    await page.getByLabel("Assignment", { exact: false }).selectOption("ROUND_ROBIN");
    await page.getByRole("checkbox", { name: "Alex Morgan", exact: true }).check();
    await page.getByRole("button", { name: "Save routing", exact: true }).click();
    await expect.poll(async () => (await db.form.findUniqueOrThrow({ where: { id: formId } })).assignmentMemberIds).toEqual([userId]);
  });

  test("member access changes wait for confirmation and submit in an action context", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("Remove access", { exact: true }).selectOption({ label: "Jamie Lane" });
    await page.getByRole("button", { name: "Remove member", exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(await db.organizationMember.count({ where: { organizationId: orgId, userId: teammateId } })).toBe(1);
    await page.getByRole("button", { name: "Remove member", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect.poll(async () => db.organizationMember.count({ where: { organizationId: orgId, userId: teammateId } })).toBe(0);
    await db.organizationMember.create({ data: { organizationId: orgId, userId: teammateId, role: "MEMBER" } });
    await page.reload();
    await page.getByLabel("Transfer ownership to", { exact: false }).selectOption({ index: 1 });
    await page.getByRole("button", { name: "Transfer ownership", exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect((await db.organizationMember.findFirstOrThrow({ where: { organizationId: orgId, userId } })).role).toBe("OWNER");
  });

  test("delete requires confirmation and mobile menu retains every destination", async ({ page }) => {
    await page.goto(`/submissions/${secondLead}`);
    await page.getByRole("button", { name: "Delete enquiry", exact: true }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect(await db.submission.count({ where: { id: secondLead } })).toBe(1);
    await page.getByRole("button", { name: "Delete enquiry", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page).toHaveURL(/\/submissions$/);
    expect(await db.submission.count({ where: { id: secondLead } })).toBe(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "Your workspace" });
    await expect(menu.getByRole("link", { name: "Settings", exact: true })).toBeVisible();
    await menu.getByRole("link", { name: "Forms", exact: true }).click();
    await expect(page).toHaveURL(/\/forms$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
