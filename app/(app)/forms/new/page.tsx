import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormBuilder } from "@/components/form-builder";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/permissions";
import { Role } from "@prisma/client";

export default async function NewFormPage() {
  await requireRole(Role.ADMIN);
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return <div className="page page-narrow"><Link className="back-link" href="/forms"><ArrowLeft size={15} />Forms</Link><PageHeader eyebrow="New collection point" title="Create a form" description="Define a small contract for the data your website sends." /><FormBuilder baseUrl={baseUrl} /></div>;
}
