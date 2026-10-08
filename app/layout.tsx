import { UIProviders } from "@/components/ui-providers";
import type { Metadata } from "next";
import "./ui.css";
import "./globals.css";
import "./brand.css";
import { jsonLd, siteDescription, siteUrl } from "@/lib/site/seo";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: "d3CRM | Website enquiry CRM for teams and agencies", template: "%s · d3CRM" },
  description: siteDescription,
  applicationName: "d3CRM",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "d3CRM",
    title: "d3CRM | Website enquiry CRM for teams and agencies",
    description: siteDescription,
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "d3CRM: From enquiry to opportunity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "d3CRM | Website enquiry CRM for teams and agencies",
    description: siteDescription,
    images: ["/opengraph-image"],
  },
  icons: { icon: "/icon.svg", apple: "/apple-icon" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><UIProviders>{children}</UIProviders><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ "@context": "https://schema.org", "@graph": [
        { "@type": "Organization", "@id": `${siteUrl.href}#organization`, name: "d3CRM", url: siteUrl.href, logo: new URL("/logo.svg", siteUrl).href },
        { "@type": "WebSite", "@id": `${siteUrl.href}#website`, name: "d3CRM", url: siteUrl.href, description: siteDescription, publisher: { "@id": `${siteUrl.href}#organization` }, inLanguage: "en" },
      ] }) }} /></body>
    </html>
  );
}
