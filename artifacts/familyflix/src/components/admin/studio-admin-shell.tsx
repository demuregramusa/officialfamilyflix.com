import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Bot,
  ChevronRight,
  Code2,
  Copyright,
  DollarSign,
  History,
  LayoutDashboard,
  LibraryBig,
  Menu,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export interface StudioNavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  moderatorAllowed?: boolean;
}

export interface StudioNavGroup {
  title: string;
  items: StudioNavItem[];
}

export const STUDIO_NAV_GROUPS: StudioNavGroup[] = [
  {
    title: "Catalog & Rights",
    items: [
      { href: "/admin", label: "Overview & Analytics", icon: LayoutDashboard, moderatorAllowed: true },
      { href: "/admin/library", label: "Library & Rights", icon: LibraryBig, moderatorAllowed: true },
      { href: "/admin/import", label: "Import Titles", icon: Upload },
      { href: "/admin/copyright", label: "Copyright Cases", icon: Copyright },
      { href: "/admin/repeat-infringers", label: "Repeat Infringers", icon: ShieldAlert },
    ],
  },
  {
    title: "Monetization & Ads",
    items: [
      { href: "/admin/ads", label: "Ad Breaks & Cues", icon: Sparkles },
      { href: "/admin/monetization", label: "Monetization & Ads", icon: DollarSign },
      { href: "/admin/developer", label: "Developer Platform", icon: Code2 },
    ],
  },
  {
    title: "Users & Moderation",
    items: [
      { href: "/admin/moderation", label: "Moderation Queue", icon: ShieldCheck, moderatorAllowed: true },
      { href: "/admin/users", label: "User Management", icon: UsersRound },
      { href: "/admin/ai-concierge", label: "AI Concierge", icon: Bot },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/settings", label: "Site Settings", icon: Settings2 },
      { href: "/admin/staff", label: "Staff Access", icon: UsersRound },
      { href: "/admin/activity", label: "Activity Log", icon: History, moderatorAllowed: true },
    ],
  },
];

function isRouteActive(path: string, href: string): boolean {
  if (href === "/admin") return path === "/admin";
  return path === href || path.startsWith(`${href}/`);
}

export function StudioAdminShell({ children }: { children: ReactNode }) {
  const [path, setLocation] = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: sessionData } = authClient.useSession();
  const user = (sessionData as unknown as {
    user?: { name?: string; email?: string; role?: string };
  } | null)?.user;
  const isAdmin = user?.role === "admin";
  const displayName = user?.name?.trim() || "Demure Admin";
  const displayEmail = user?.email?.trim() || "admin@familyflix.demuregram.com";
  const roleLabel = isAdmin ? "Admin" : user?.role ? user.role : "Staff";

  const visibleGroups = useMemo(() => {
    if (isAdmin) return STUDIO_NAV_GROUPS;
    return STUDIO_NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.moderatorAllowed),
    })).filter((group) => group.items.length > 0);
  }, [isAdmin]);

  const flatVisibleItems = useMemo(
    () => visibleGroups.flatMap((g) => g.items.map((item) => ({ ...item, groupTitle: g.title }))),
    [visibleGroups],
  );

  const activeContext = useMemo(() => {
    const matched = flatVisibleItems.find((item) => isRouteActive(path, item.href));
    if (matched) {
      return { group: matched.groupTitle, label: matched.label };
    }
    return { group: "Studio", label: "Overview & Analytics" };
  }, [flatVisibleItems, path]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return flatVisibleItems
      .filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.groupTitle.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [flatVisibleItems, searchQuery]);

  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "DA";

  const sidebarBody = (
    <div className="flex h-full flex-col bg-[#0F1117]">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-5">
        <Link
          href="/admin"
          onClick={() => setMobileDrawerOpen(false)}
          className="flex min-w-0 items-center gap-2.5"
          data-testid="link-studio-brand"
        >
          <span className="inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#FF3B5C] to-[#00D2FF] p-[1.5px] shadow-[0_4px_16px_rgba(255,59,92,0.28)]">
            <img
              src="/icon-192.png"
              alt=""
              aria-hidden="true"
              className="size-full rounded-[6.5px] bg-[#0B0D12] object-cover"
            />
          </span>
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-bold tracking-tight text-white">
              FamilyFlix{" "}
              <span className="bg-gradient-to-r from-[#FF3B5C] to-[#00D2FF] bg-clip-text text-transparent">
                Studio
              </span>
            </span>
            <span className="block truncate text-[11px] font-medium text-slate-400">
              Demure Platforms Inc.
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(false)}
          aria-label="Close studio sidebar"
          className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      {/* Grouped Admin Navigation */}
      <nav
        aria-label="FamilyFlix Studio navigation"
        className="flex-1 space-y-5 overflow-y-auto px-3 py-5"
      >
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-slate-500">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isRouteActive(path, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    aria-current={active ? "page" : undefined}
                    data-testid={`link-admin-${item.label.toLowerCase().replaceAll(" ", "-")}`}
                    className={cn(
                      "group relative flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13.5px] font-medium transition-colors",
                      active
                        ? "bg-gradient-to-r from-[#FF3B5C]/15 via-[#FF3B5C]/8 to-transparent text-white"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-[#FF3B5C] to-[#00D2FF]"
                      />
                    )}
                    <Icon
                      size={16}
                      aria-hidden
                      className={cn(
                        "shrink-0 transition-colors",
                        active ? "text-[#00D2FF]" : "text-slate-500 group-hover:text-slate-300",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Single Exit to FamilyFlix Footer */}
      <div className="shrink-0 border-t border-white/[0.08] p-3">
        <Link
          href="/"
          data-testid="link-admin-exit"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-[#161922] px-3 text-[13px] font-semibold text-slate-200 transition hover:border-[#00D2FF]/50 hover:bg-[#1B202C] hover:text-white"
        >
          <ArrowLeft size={15} className="shrink-0 text-[#00D2FF]" aria-hidden />
          <span>Exit to FamilyFlix</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="ff-admin-studio min-h-dvh bg-[#0B0D12] text-slate-100">
      {/* Fixed 256px Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:block lg:w-[256px] lg:border-r lg:border-white/[0.08]">
        {sidebarBody}
      </aside>

      {/* Mobile / Tablet Collapsible Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Studio navigation">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative z-10 h-full w-[264px] max-w-[85vw] border-r border-white/[0.08] shadow-2xl">
            {sidebarBody}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex min-h-dvh min-w-0 flex-col lg:pl-[256px]">
        {/* Minimal 64px Top Utility Bar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0B0D12]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open studio navigation"
              data-testid="button-admin-mobile-drawer"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/[0.1] bg-[#161922] text-slate-300 transition hover:border-white/25 hover:text-white lg:hidden"
            >
              <Menu size={18} />
            </button>
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="hidden font-medium text-slate-500 sm:inline">Studio</span>
              <ChevronRight size={14} className="hidden shrink-0 text-slate-600 sm:inline" aria-hidden />
              <span className="hidden truncate font-medium text-slate-400 md:inline">
                {activeContext.group}
              </span>
              <ChevronRight size={14} className="hidden shrink-0 text-slate-600 md:inline" aria-hidden />
              <span className="truncate font-semibold text-white">{activeContext.label}</span>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {/* Global Admin Search */}
            <div className="relative hidden sm:block">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 160)}
                placeholder="Jump to section…"
                aria-label="Global admin search"
                data-testid="input-admin-global-search"
                className="h-9 w-48 rounded-lg border border-white/[0.1] bg-[#161922] pl-9 pr-3 text-[13px] text-slate-100 placeholder:text-slate-500 transition focus:w-64 focus:border-[#00D2FF] focus:outline-none focus:ring-2 focus:ring-[#00D2FF]/20"
              />
              {searchFocused && searchQuery.trim() && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-white/[0.1] bg-[#161922] p-1.5 shadow-2xl">
                  {searchResults.length > 0 ? (
                    searchResults.map((res) => {
                      const Icon = res.icon;
                      return (
                        <button
                          key={res.href}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSearchQuery("");
                            setSearchFocused(false);
                            setLocation(res.href);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-200 transition hover:bg-white/[0.06] hover:text-white"
                        >
                          <Icon size={14} className="shrink-0 text-[#00D2FF]" />
                          <span className="min-w-0 flex-1 truncate">{res.label}</span>
                          <span className="shrink-0 text-[10px] text-slate-500">{res.groupTitle}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-2.5 py-2 text-xs text-slate-500">No matching studio sections</p>
                  )}
                </div>
              )}
            </div>

            {/* Demure Admin Profile Badge */}
            <div
              className="flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#161922] py-1 pl-1.5 pr-3"
              title={`${displayName} (${displayEmail})`}
              data-testid="badge-admin-profile"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#FF3B5C] to-[#00D2FF] text-[11px] font-bold text-white">
                {initials}
              </span>
              <div className="hidden leading-tight md:block">
                <p className="max-w-[130px] truncate text-xs font-semibold text-white">{displayName}</p>
                <p className="text-[10px] font-medium text-[#00D2FF]">{roleLabel}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Studio Workspace Content */}
        <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
