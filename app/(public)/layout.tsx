import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="product-site"><SiteHeader /><main id="main-content" className="resource-page">{children}</main><SiteFooter /></div>;
}
