"use client";

import { FileInput, Inbox, LayoutDashboard, LogOut, Settings2 } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/forms", label: "Forms", icon: FileInput },
  { href: "/submissions", label: "Submissions", icon: Inbox },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="app-nav" aria-label="Primary navigation">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <Link className="nav-item" data-active={active || undefined} href={href} key={href}>
              <Icon aria-hidden size={17} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="account-card">
        <span className="avatar" aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
        <span className="account-copy"><strong>{name}</strong><small>{email}</small></span>
        <button className="icon-button" onClick={() => signOut({ callbackUrl: "/sign-in" })} aria-label="Sign out" title="Sign out">
          <LogOut aria-hidden size={16} />
        </button>
      </div>
    </>
  );
}
