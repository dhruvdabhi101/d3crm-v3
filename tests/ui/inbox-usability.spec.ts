import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import { randomUUID } from "node:crypto";

const database = new URL(process.env.DATABASE_URL ?? "http://missing");
const base = process.env.NEXTAUTH_URL ?? "http://missing";
if (!["localhost", "127.0.0.1"].includes(database.hostname) || !database.pathname.endsWith("_test") || !["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("UI checks require an isolated local test database and server.");
const db = new PrismaClient();
let userId: string, organizationId: string, formId: string, token: string;

test.beforeAll(async () => {
  const suffix = randomUUID();
  const user = await db.user.create({ data: { name: "Usability owner", email: `usability-${suffix}@example.test`, passwordHash: "unused-test-only", emailVerifiedAt: new Date() } });
  userId = user.id;
  const organization = await db.organization.create({ data: { name: "Usability workspace", slug: `usability-${suffix}`, members: { create: { userId, role: "OWNER" } } } });
  organizationId = organization.id;
  const schema = { version: 1, fields: [{ id: "name", label: "Name", type: "text", required: true }] };
  const form = await db.form.create({ data: { name: "Usability enquiries", slug: `usability-form-${suffix}`, organizationId, schema, keyHash: randomUUID(), keyPrefix: "test-only" } });
  formId = form.id;
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  await db.submission.createMany({ data: [-1, 0, 1].map((offset, index) => ({ formId, schemaSnapshot: schema, data: { name: `Usability lead ${index + 1}` }, status: "NEW", assigneeId: index === 0 ? userId : null, readAt: index === 2 ? today : null, followUpAt: new Date(today.getTime() + offset * 86400_000) })) });
  token = await encode({ token: { id: userId, sessionVersion: user.sessionVersion, name: user.name, email: user.email }, secret: process.env.NEXTAUTH_SECRET!, maxAge: 3600 });
});

test.afterAll(async () => {
  if (organizationId) await db.organization.delete({ where: { id: organizationId } });
  if (userId) await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: "next-auth.session-token", value: token, url: base, httpOnly: true, sameSite: "Lax" }]);
});

test("quick views preserve filters, reset pagination, and work in either layout", async ({ page }) => {
  await page.goto(`/submissions?q=Usability&status=NEW&form=${formId}&sort=oldest&page=2`);
  await page.getByRole("navigation", { name: "Quick inbox views" }).getByRole("link", { name: "Assigned to me", exact: true }).click();
  await expect(page).toHaveURL(/view=mine/);
  const params = new URL(page.url()).searchParams;
  expect(params.get("q")).toBe("Usability");
  expect(params.get("status")).toBe("NEW");
  expect(params.get("form")).toBe(formId);
  expect(params.get("sort")).toBe("oldest");
  expect(params.has("page")).toBe(false);
  await expect(page.locator(".inbox-list-row")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Quick inbox views" }).getByRole("link", { name: "Assigned to me", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await expect(page.locator(".pipeline-lead")).toHaveCount(1);
  await page.getByRole("link", { name: "Remove Status: New", exact: true }).click();
  await expect(page).toHaveURL(/layout=board/);
  expect(new URL(page.url()).searchParams.get("status")).toBe("");
  expect(new URL(page.url()).searchParams.get("view")).toBe("mine");
  await page.getByRole("link", { name: "Clear all filters", exact: true }).click();
  await expect(page.locator(".pipeline-lead")).toHaveCount(3);
  await expect(page).toHaveURL(/layout=board/);
});

test("mobile filters remain usable when collapsed and empty results offer recovery", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/submissions?status=NEW&form=${formId}&view=unread&sort=oldest`);
  await expect(page.getByRole("button", { name: /^Filters/ })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("textbox", { name: "Search", exact: true }).fill("No such enquiry");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No matching enquiries" })).toBeVisible();
  const params = new URL(page.url()).searchParams;
  expect(params.get("status")).toBe("NEW");
  expect(params.get("form")).toBe(formId);
  expect(params.get("view")).toBe("unread");
  expect(params.get("sort")).toBe("oldest");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page.locator(".inbox-list-row")).toHaveCount(3);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("WON");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByRole("link", { name: "Remove Status: Won" })).toBeVisible();
  await page.getByRole("link", { name: "Remove Status: Won" }).click();
  await expect(page.locator(".inbox-list-row")).toHaveCount(3);
});

test("overview prioritizes actionable work over the chart on desktop and mobile", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dashboard");
    const priorities = page.getByRole("region", { name: "Your priorities" });
    await expect(priorities.locator('a[href="/follow-ups?period=overdue"]')).toContainText("1");
    await expect(priorities.locator('a[href="/follow-ups?period=today"]')).toContainText("1");
    await expect(priorities.locator('a[href="/submissions?view=unread"]')).toContainText("2");
    await expect(page.locator(".overview-followups time").first()).toContainText("Overdue");
    const followUps = await page.locator(".overview-followups").boundingBox();
    const chart = await page.getByRole("region", { name: "Seven-day enquiry activity" }).boundingBox();
    expect(followUps!.y + followUps!.height).toBeLessThan(chart!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
