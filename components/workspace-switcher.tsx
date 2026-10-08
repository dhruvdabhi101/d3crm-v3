"use client";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { useRef } from "react";
import { switchOrganization } from "@/lib/actions/organization";

export function WorkspaceSwitcher({ currentId, organizations }: { currentId: string; organizations: { id: string; name: string; role: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  return <form action={switchOrganization} ref={formRef} className="workspace-switcher"><NativeSelect key={currentId} aria-label="Current organization" name="organizationId" defaultValue={currentId} onChange={() => formRef.current?.requestSubmit()}>{organizations.map((organization) => <NativeSelectOption value={organization.id} key={organization.id}>{organization.name} · {organization.role.toLowerCase()}</NativeSelectOption>)}</NativeSelect></form>;
}
