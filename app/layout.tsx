import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: { default: "d3CRM | Website forms and a thoughtful inbox", template: "%s · d3CRM" },
  description: "Create website forms, collect submissions, and manage every conversation in one quiet inbox with d3CRM.",
  applicationName: "d3CRM",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "d3CRM",
    title: "d3CRM | Website forms and a thoughtful inbox",
    description: "Create website forms, collect submissions, and manage every conversation in one quiet inbox.",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "d3CRM — a quiet place for every hello" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "d3CRM | Website forms and a thoughtful inbox",
    description: "Create website forms, collect submissions, and manage every conversation in one quiet inbox.",
    images: ["/opengraph-image"],
  },
  icons: { icon: "/icon.svg", apple: "/apple-icon" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
