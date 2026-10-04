import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/demo"].map(path => ({ url: new URL(path, process.env.NEXTAUTH_URL ?? "http://localhost:3000").toString(), changeFrequency: "monthly" as const, priority: path === "/" ? 1 : .8 }));
}
