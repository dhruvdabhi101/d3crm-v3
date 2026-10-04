"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Overview" },
  { href: "/forms", label: "Forms" },
  { href: "/submissions", label: "Submissions" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({ name, email, canAdmin }: { name: string; email: string; canAdmin: boolean }) {
  const pathname = usePathname();
  const navigation = canAdmin ? [...items.slice(0, -1), { href: "/activity", label: "Activity" }, items[items.length - 1]] : items;
  return <>
    <nav className="app-nav" aria-label="Primary navigation">
      {navigation.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link className="nav-item" aria-current={active ? "page" : undefined} href={href} key={href}>{label}</Link>;
      })}
    </nav>
    <div className="account-controls"><span className="avatar" title={`${name} · ${email}`} aria-label={`Signed in as ${name}`}>{name.slice(0, 1).toUpperCase()}</span><button className="icon-button" onClick={() => signOut({ callbackUrl: "/sign-in" })} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button></div>
  </>;
}
