import { Link, useLocation } from "wouter";
import {
  Code2,
  Key,
  LayoutDashboard,
  Terminal,
  CreditCard,
  Coins,
  BookOpen,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/developers/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/developers/keys", label: "API Keys", icon: Key },
  { href: "/developers/playground", label: "Playground", icon: Terminal },
  { href: "/developers/billing", label: "Billing & Plans", icon: CreditCard },
  { href: "/developers/credits", label: "Credit Wallets", icon: Coins },
  { href: "/developers/docs", label: "Documentation", icon: BookOpen },
];

export function DeveloperNav({ activeTab }: { activeTab?: string }) {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0c0817]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/developers" className="flex items-center gap-2.5 group">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 shadow-md group-hover:shadow-purple-500/25 transition">
              <Code2 size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-sm tracking-wide text-white uppercase">
                <span>FamilyFlix</span>
                <span className="text-purple-400">Dev</span>
              </div>
              <p className="text-[10px] font-semibold text-white/50 tracking-wider uppercase">By DemureGram</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = (activeTab && activeTab === item.label.toLowerCase()) || location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                    isActive
                      ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={13} />
            <span className="hidden sm:inline">Streaming App</span>
          </Link>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="flex md:hidden overflow-x-auto border-t border-white/5 px-2 py-1.5 scrollbar-none gap-1 bg-[#090612]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition",
                isActive
                  ? "bg-purple-600/25 text-purple-300 border border-purple-500/30"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Icon size={12} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
