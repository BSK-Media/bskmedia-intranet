"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, Briefcase, Building2, ClipboardList, Gift, BarChart3, MessageSquare, Shield, Bell, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = { href: string; label: string; icon: React.ReactNode };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, adminUser, impersonating, loading, logout, stopImpersonation } = useAuth();
  const role = user?.role;

  const adminNav: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
    { href: "/admin/clients", label: "Klienci", icon: <Building2 className="h-4 w-4" /> },
    { href: "/admin/projects", label: "Projekty", icon: <Briefcase className="h-4 w-4" /> },
    { href: "/admin/employees", label: "Pracownicy", icon: <Users className="h-4 w-4" /> },
    { href: "/admin/assignments", label: "Przypisania", icon: <Shield className="h-4 w-4" /> },
    { href: "/admin/timesheets", label: "Timesheet", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/admin/bonuses", label: "Premie", icon: <Gift className="h-4 w-4" /> },
    { href: "/admin/goals", label: "Cele KPI", icon: <Target className="h-4 w-4" /> },
    { href: "/admin/reports", label: "Raporty", icon: <BarChart3 className="h-4 w-4" /> },
    { href: "/admin/audit", label: "Audit log", icon: <Shield className="h-4 w-4" /> },
    { href: "/admin/reminders", label: "Przypomnienia", icon: <Bell className="h-4 w-4" /> },
    { href: "/chat", label: "Czat", icon: <MessageSquare className="h-4 w-4" /> },
  ];

  const empNav: NavItem[] = [
    { href: "/me", label: "Dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
    { href: "/me/projects", label: "Moje projekty", icon: <Briefcase className="h-4 w-4" /> },
    { href: "/me/timesheet", label: "Mój timesheet", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/me/bonuses", label: "Moje premie", icon: <Gift className="h-4 w-4" /> },
    { href: "/me/summary", label: "Podsumowanie", icon: <BarChart3 className="h-4 w-4" /> },
    { href: "/chat", label: "Czat", icon: <MessageSquare className="h-4 w-4" /> },
  ];

  const items = role === "ADMIN" ? adminNav : empNav;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="flex">
        <aside className="sticky top-0 h-screen w-[260px] border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="BSK Media"
                width={44}
                height={44}
                className="rounded-xl"
                priority
              />
              <div>
                <div className="text-lg font-semibold leading-tight">BSK MEDIA</div>
                <div className="text-xs text-zinc-500">Agencja kreatywna • Intranet</div>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {items.map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    active ? "bg-zinc-100 dark:bg-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-900",
                  )}
                >
                  {it.icon}
                  {it.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 p-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <div className="text-sm text-zinc-600 dark:text-zinc-400">{role === "ADMIN" ? "Panel Administratora" : "Panel Pracownika"}</div>
                {impersonating && adminUser ? (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    Podgląd jako: <b>{user?.name}</b> • zalogowany admin: <b>{adminUser.name}</b>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={loading}>
                      {(user?.name ?? user?.email ?? "Użytkownik").toString()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={logout}>Wyloguj</DropdownMenuItem>
                    {impersonating ? (
                      <DropdownMenuItem onClick={stopImpersonation}>Zakończ podgląd</DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="p-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
