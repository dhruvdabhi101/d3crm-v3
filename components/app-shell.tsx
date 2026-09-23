import { Brand } from "@/components/brand";
import { AppNav } from "@/components/app-nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

export function AppShell({ children, organizationId, organizations, user }: {
  children: React.ReactNode;
  organizationId: string;
  organizations: { id: string; name: string; role: string }[];
  user: { name: string; email: string };
}) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Brand />
          <WorkspaceSwitcher currentId={organizationId} organizations={organizations} />
        </div>
        <AppNav name={user.name} email={user.email} />
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
