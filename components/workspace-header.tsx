"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

const sections: Record<string, string> = { dashboard: "Overview", submissions: "Inbox", "follow-ups": "Follow-ups", forms: "Forms", reports: "Reports", clients: "Clients", templates: "Reply templates", activity: "Activity", settings: "Settings" };

export function WorkspaceHeader({ name }: { name: string }) {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  return <header className="workspace-topbar"><span>Workspace <ChevronRight size={14} /><strong>{sections[parts[0]] ?? "Workspace"}</strong>{parts.length > 1 && <><ChevronRight size={14} /><span>{parts[1] === "new" ? "New form" : "Details"}</span></>}</span><span className="topbar-account"><span className="topbar-name"><span className="live-dot" />{name}</span><button className="icon-button mobile-signout" onClick={() => signOut({ callbackUrl: "/sign-in" })} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button></span></header>;
}
