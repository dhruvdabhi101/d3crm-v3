import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormBuilder } from "@/components/form-builder";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/permissions";
import { Role } from "@prisma/client";

export default async function NewFormPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  await requireRole(Role.ADMIN);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return <div className="page page-builder"><Link className="back-link" href="/forms"><ArrowLeft size={15} />Forms</Link><PageHeader eyebrow="New form" title="Create a form" description="A few good questions. A new conversation." /><FormBuilder key={mode ?? "manual"} baseUrl={baseUrl} initialMode={mode === "ai" ? "ai" : "manual"} /></div>;
}
