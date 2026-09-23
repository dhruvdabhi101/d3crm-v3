import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "d3CRM", template: "%s · d3CRM" },
  description: "The quiet inbox for your website forms.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
