import { Brand } from "@/components/brand";
import { AppNav } from "@/components/app-nav";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";

export function AppShell({ children, organizationId, organizations, user, canAdmin }: {
  children: React.ReactNode;
  organizationId: string;
  organizations: { id: string; name: string; role: string }[];
  user: { name: string; email: string };
  canAdmin: boolean;
}) {
  return <div className="app-frame">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-toolbar"><div className="toolbar-inner">
      <div className="workspace-identity"><Brand /><span className="identity-divider" aria-hidden>/</span><WorkspaceSwitcher currentId={organizationId} organizations={organizations} /></div>
      <AppNav name={user.name} email={user.email} canAdmin={canAdmin} />
    </div></header>
    <main id="main-content" className="main-content">{children}</main>
  </div>;
}
