"use client";

import { Activity, CalendarDays, ChartNoAxesCombined, ChevronDown, FileInput, Inbox, LayoutDashboard, LogOut, Menu, Mail, Settings2, Users } from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const groups = [
  { label: "Daily work", items: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/submissions", label: "Inbox", icon: Inbox },
    { href: "/follow-ups", label: "Follow-ups", icon: CalendarDays },
  ] },
  { label: "Workspace", items: [
    { href: "/forms", label: "Forms", icon: FileInput },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/templates", label: "Reply templates", icon: Mail },
    { href: "/reports", label: "Reports", icon: ChartNoAxesCombined },
  ] },
];

export function AppNav({ name, email, canAdmin }: { name: string; email: string; canAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navigation = <nav className="app-nav" aria-label="Primary navigation">
    {groups.map(group => <div className="nav-group" key={group.label}><p className="nav-group-label">{group.label}</p>{group.items.map(({ href, label, icon: Icon }) => <Link className="nav-item" aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined} href={href} key={href} onClick={() => setOpen(false)}><Icon size={18} strokeWidth={1.7} /><span>{label}</span></Link>)}</div>)}
    <div className="nav-group"><p className="nav-group-label">Manage</p>{canAdmin && <Link className="nav-item" href="/activity" aria-current={pathname === "/activity" ? "page" : undefined} onClick={() => setOpen(false)}><Activity size={18} />Activity</Link>}<Link className="nav-item" href="/settings" aria-current={pathname === "/settings" ? "page" : undefined} onClick={() => setOpen(false)}><Settings2 size={18} />Settings</Link></div>
  </nav>;
  const account = <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" className="account-trigger"><span className="avatar" aria-hidden>{name.slice(0, 1).toUpperCase()}</span><span className="account-name"><strong>{name}</strong><span>Account</span></span><ChevronDown size={15} /></Button></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="min-w-56"><DropdownMenuLabel className="max-w-64 truncate">{email}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/settings"><Settings2 />Account settings</Link></DropdownMenuItem><DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/sign-in" })}><LogOut />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
  return <><div className="desktop-navigation">{navigation}</div><div className="mobile-navigation"><Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="outline" className="navigation-toggle"><Menu size={18} />Menu</Button></SheetTrigger><SheetContent side="left" className="mobile-workspace-menu"><SheetHeader><SheetTitle>Your workspace</SheetTitle><SheetDescription>Find your work. Keep it moving.</SheetDescription></SheetHeader>{navigation}<div className="mobile-menu-account">{account}</div></SheetContent></Sheet></div><div className="account-controls">{account}</div></>;
}
