"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Clapperboard,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UploadCloud,
  Users,
} from "lucide-react";
import { useState } from "react";

import { FamilyFlixLogo } from "@/components/familyflix/logo";
import {
  can,
  ROLE_LABELS,
  type Capability,
  type StaffRole,
} from "@/lib/admin/permissions";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV: {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  capability: Capability;
}[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, capability: "library.view" },
  { label: "Library", href: "/admin/library", icon: Clapperboard, capability: "library.view" },
  { label: "Import", href: "/admin/import", icon: UploadCloud, capability: "library.import" },
  { label: "Add title", href: "/admin/library/new", icon: Plus, capability: "library.create" },
  { label: "Activity", href: "/admin/activity", icon: Activity, capability: "audit.view" },
  { label: "Settings", href: "/admin/settings", icon: Settings, capability: "settings.view" },
  { label: "Staff", href: "/admin/staff", icon: Users, capability: "staff.manage" },
];

export function AdminShell({
  children,
  email,
  name,
  role,
}: {
  children: React.ReactNode;
  email: string;
  name: string;
  role: StaffRole;
}) {
  const pathname = usePathname();
  const nav = NAV.filter((item) => can(role, item.capability));
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/library/new") return pathname === "/admin/library/new";
    if (href === "/admin/library") {
      return (
        pathname.startsWith("/admin/library") && pathname !== "/admin/library/new"
      );
    }
    return pathname.startsWith(href);
  };

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/auth/sign-in");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-[#0c1014] lg:flex">
      <aside className="hidden w-[248px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0712] px-4 py-5 lg:flex">
        <div className="px-1">
          <FamilyFlixLogo />
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
            Admin console
          </p>
        </div>

        <nav aria-label="Admin" className="mt-7 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors",
                isActive(item.href)
                  ? "bg-white/[0.08] text-white"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white/85",
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
          <p
            className={
              role === "admin"
                ? "flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300"
                : "flex items-center gap-1.5 text-[11px] font-semibold text-amber-300"
            }
          >
            <ShieldCheck className="size-3.5" aria-hidden />
            {role === "admin" ? "Signed in as admin" : "Signed in as moderator"}
          </p>
          <p className="mt-1.5 truncate text-[11.5px] font-medium text-white/70">{name}</p>
          <p className="truncate text-[11px] text-white/40">{email}</p>
          <p className="mt-1.5 inline-flex rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
            {ROLE_LABELS[role]}
          </p>
        </div>

        <div className="mt-auto space-y-1 pt-6">
          <Link
            href="/"
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-[12.5px] text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/80"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            View public site
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[12.5px] text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/80 disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0c1014]/95 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <FamilyFlixLogo />
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              aria-label="Sign out"
              className="grid size-10 place-items-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
          <nav
            aria-label="Admin"
            className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none]"
          >
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/85",
                )}
              >
                <item.icon className="size-3.5" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1240px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
