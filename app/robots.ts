import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    // Search crawlers, including OAI-SearchBot, inherit the public-site policy.
    // Account pages remain crawlable so their noindex metadata can be read.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/forms", "/submissions", "/settings", "/reports", "/activity", "/clients", "/templates", "/follow-ups"] },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  };
}
