import { Brand } from "@/components/brand";
import { AppNav } from "@/components/app-nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { WorkspaceSearch } from "@/components/workspace-search";
import { WorkspaceHeader } from "@/components/workspace-header";

export function AppShell({ children, organizationId, organizations, user, canAdmin }: {
  children: React.ReactNode;
  organizationId: string;
  organizations: { id: string; name: string; role: string }[];
  user: { name: string; email: string };
  canAdmin: boolean;
}) {
  return <div className="app-frame">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="workspace-sidebar" aria-label="Workspace">
      <div className="sidebar-brand"><Brand /></div>
      <WorkspaceSwitcher currentId={organizationId} organizations={organizations} />
      <WorkspaceSearch key={organizationId} canAdmin={canAdmin} />
      <AppNav name={user.name} email={user.email} canAdmin={canAdmin} />
    </aside>
    <div className="workspace-body"><WorkspaceHeader name={user.name} />
      <main id="main-content" className="main-content">{children}</main>
    </div>
  </div>;
}
