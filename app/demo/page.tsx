import type { Metadata } from "next";
import { ProductDemo } from "@/components/product-demo";

export const metadata: Metadata = { title: "Interactive demo", description: "Explore the d3CRM inbox, pipeline and follow-ups with a fictional agency workspace.", alternates: { canonical: "/demo" } };

export default function DemoPage() { return <ProductDemo />; }
