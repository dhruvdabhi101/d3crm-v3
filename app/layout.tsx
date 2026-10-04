import type { Metadata } from "next";
import "./globals.css";
import "./brand.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: { default: "d3CRM | From enquiry to opportunity", template: "%s · d3CRM" },
  description: "Website forms, a shared inbox, and follow-ups. One connected enquiry workflow for small teams and agencies.",
  applicationName: "d3CRM",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "d3CRM",
    title: "d3CRM | From enquiry to opportunity",
    description: "Website forms, a shared inbox, and follow-ups. One connected workflow for you and your clients.",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "d3CRM: From enquiry to opportunity" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "d3CRM | From enquiry to opportunity",
    description: "Website forms, a shared inbox, and follow-ups. One connected workflow for you and your clients.",
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
