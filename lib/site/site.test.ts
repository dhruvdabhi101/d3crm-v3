import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { campaignUrl } from "./tools.ts";
import { guides, publicPaths } from "./guides.ts";
import { breadcrumb, jsonLd, publicMetadata, siteUrl } from "./seo.ts";

const campaign = { utm_source: " Newsletter ", utm_medium: " EMAIL ", utm_campaign: "Launch & learn", utm_term: "", utm_content: "hero link" };

test("campaign links replace stale tags, preserve URL context, and encode values", () => {
  const url = new URL(campaignUrl("https://example.com/contact?ref=partner&utm_source=old&utm_source=duplicate&utm_term=old#form", campaign));
  assert.equal(url.searchParams.get("ref"), "partner");
  assert.equal(url.hash, "#form");
  assert.deepEqual(url.searchParams.getAll("utm_source"), ["newsletter"]);
  assert.equal(url.searchParams.get("utm_medium"), "email");
  assert.equal(url.searchParams.get("utm_campaign"), "Launch & learn");
  assert.equal(url.searchParams.get("utm_content"), "hero link");
  assert.equal(url.searchParams.has("utm_term"), false);
  for (const input of ["example.com", "javascript:alert(1)", "ftp://example.com", "https://user:password@example.com"]) assert.throws(() => campaignUrl(input, campaign));
  assert.throws(() => campaignUrl("https://example.com", { ...campaign, utm_campaign: " " }));
  assert.throws(() => campaignUrl("https://example.com", { ...campaign, utm_content: "x".repeat(201) }));
  assert.throws(() => campaignUrl(`https://example.com/${"x".repeat(2048)}`, campaign));
  assert.throws(() => campaignUrl(`https://example.com/${"x".repeat(1900)}`, { ...campaign, utm_content: "x".repeat(200) }));
});

test("public discovery lists real pages and excludes private routes", () => {
  assert.equal(new Set(publicPaths).size, publicPaths.length);
  for (const path of publicPaths) {
    const file = path.startsWith("/guides/") ? "app/(public)/guides/[slug]/page.tsx" : ["/", "/demo"].includes(path) ? `app${path === "/" ? "" : path}/page.tsx` : `app/(public)${path}/page.tsx`;
    assert.ok(existsSync(file), path);
    assert.ok(readFileSync("public/llms.txt", "utf8").includes(`](${path})`), path);
  }
  for (const guide of guides) assert.ok(guides.some(item => item.slug === guide.related));
  assert.ok(!publicPaths.some(path => /api|settings|submissions|sign-in|sign-up/.test(path)));
  for (const group of ["(app)", "(auth)"]) assert.match(readFileSync(`app/${group}/layout.tsx`, "utf8"), /index: false/);
});

test("metadata and structured data use each page's canonical origin and safe JSON", () => {
  const metadata = publicMetadata("A guide", "Description", "/guides/example");
  assert.deepEqual(metadata.alternates, { canonical: "/guides/example" });
  assert.equal((metadata.openGraph as { url: string }).url, "/guides/example");
  assert.equal(metadata.twitter?.title, "A guide");
  const crumbs = breadcrumb([{ name: "Home", path: "/" }, { name: "Guides", path: "/guides" }]);
  assert.equal(crumbs.itemListElement[1].position, 2);
  assert.equal(crumbs.itemListElement[1].item, new URL("/guides", siteUrl).href);
  const dangerous = { text: "</script><script>alert(1)</script>" };
  assert.ok(!jsonLd(dangerous).includes("<"));
  assert.deepEqual(JSON.parse(jsonLd(dangerous)), dangerous);
});
