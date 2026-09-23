"use client";

import { useRef } from "react";
import { switchOrganization } from "@/lib/actions/organization";

export function WorkspaceSwitcher({ currentId, organizations }: { currentId: string; organizations: { id: string; name: string; role: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  return <form action={switchOrganization} ref={formRef} className="workspace-switcher"><select aria-label="Current organization" name="organizationId" defaultValue={currentId} onChange={() => formRef.current?.requestSubmit()}>{organizations.map((organization) => <option value={organization.id} key={organization.id}>{organization.name} · {organization.role.toLowerCase()}</option>)}</select></form>;
}
