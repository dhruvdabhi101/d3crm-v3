import { ProductDemo } from "@/components/product-demo";
import { publicMetadata } from "@/lib/site/seo";

export const metadata = publicMetadata("Interactive website enquiry CRM demo", "Try the d3CRM inbox, pipeline, assignments, and follow-ups with a fictional agency workspace. No account required.", "/demo");

export default function DemoPage() { return <ProductDemo />; }
