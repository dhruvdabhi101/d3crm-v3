import type { Metadata } from "next";

// Reuse the existing deployment origin; never derive canonical URLs from request headers.
export const siteUrl = new URL("/", process.env.NEXTAUTH_URL ?? "http://localhost:3000");
export const siteDescription = "A website enquiry CRM for small teams and agencies. Connect contact forms, manage leads in a shared inbox, and schedule follow-ups with d3CRM.";

export function publicMetadata(title: string, description: string, path: string): Metadata {
  return {
    title, description, alternates: { canonical: path },
    openGraph: { type: "website", title, description, url: path, siteName: "d3CRM", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "d3CRM website enquiry workspace" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

export function breadcrumb(items: { name: string; path: string }[]) {
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: new URL(item.path, siteUrl).href })) };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
