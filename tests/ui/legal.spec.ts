import { test, expect } from "@playwright/test";
import { legalVersion } from "../../lib/legal";

test("legal documents remain readable and linked on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const [path, title] of [["/privacy", "Privacy Policy"], ["/terms", "Terms of Service"], ["/data-processing", "Data Processing Agreement"], ["/account-data-notice", "Account Data Notice"]]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(page.locator("#contact")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await expect(page.getByRole("navigation", { name: "Footer", exact: true }).getByRole("link", { name: "Privacy", exact: true })).toHaveAttribute("href", "/privacy");
});

test("signup starts unchecked and submits separate affirmative choices with the notice revision", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Your name", { exact: true }).fill("Alex Morgan");
  await page.getByLabel("Organization", { exact: true }).fill("Alex’s workspace");
  await page.getByLabel("Email", { exact: true }).fill("alex@example.test");
  await page.getByLabel(/^Password/).fill("A-valid-password-2026");
  const terms = page.getByRole("checkbox", { name: /I am at least 18/ });
  const consent = page.getByRole("checkbox", { name: /I consent to using/ });
  await expect(terms).not.toBeChecked();
  await expect(consent).not.toBeChecked();
  let attempts = 0;
  await page.route("**/api/auth/register", async route => {
    attempts++;
    expect(route.request().postDataJSON()).toMatchObject({ acceptedTerms: true, accountConsent: true, legalVersion });
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "Review test completed." }) });
  });
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  expect(attempts).toBe(0);
  await terms.check();
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  expect(attempts).toBe(0);
  await consent.check();
  await page.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Review test completed." })).toBeVisible();
  expect(attempts).toBe(1);
});
