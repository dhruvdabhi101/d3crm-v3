import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", process.env.NEXTAUTH_URL ?? "http://localhost:3000").toString(), changeFrequency: "monthly", priority: 1 }];
}
