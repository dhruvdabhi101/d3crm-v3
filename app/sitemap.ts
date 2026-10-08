import type { MetadataRoute } from "next";
import { publicPaths } from "@/lib/site/guides";
import { siteUrl } from "@/lib/site/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map(path => ({ url: new URL(path, siteUrl).href }));
}
