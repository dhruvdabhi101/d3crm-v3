"use client";

import { Activity, CalendarDays, ChartNoAxesCombined, ChevronDown, FileInput, Inbox, LayoutDashboard, LogOut, Mail, Settings2, Users } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/submissions", label: "Inbox", icon: Inbox },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarDays },
  { href: "/forms", label: "Forms", icon: FileInput },
  { href: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/templates", label: "Reply templates", icon: Mail },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppNav({ name, email, canAdmin }: { name: string; email: string; canAdmin: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = canAdmin ? [...items.slice(0, -1), { href: "/activity", label: "Activity", icon: Activity }, items[items.length - 1]] : items;
  return <>
    <div className="mobile-navigation" data-open={menuOpen}>
      <button className="navigation-toggle" aria-expanded={menuOpen} aria-controls="workspace-navigation" onClick={() => setMenuOpen(value => !value)}>Workspace menu <ChevronDown size={16} /></button>
    <nav id="workspace-navigation" className="app-nav" aria-label="Primary navigation">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link className="nav-item" aria-current={active ? "page" : undefined} href={href} key={href} onClick={() => setMenuOpen(false)}><Icon size={18} strokeWidth={1.7} /><span>{label}</span></Link>;
      })}
    </nav>
    </div>
    <div className="account-controls"><span className="avatar" aria-hidden>{name.slice(0, 1).toUpperCase()}</span><div className="account-name"><strong>{name}</strong><span>{email}</span></div><button className="icon-button" onClick={() => signOut({ callbackUrl: "/sign-in" })} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button></div>
  </>;
}
