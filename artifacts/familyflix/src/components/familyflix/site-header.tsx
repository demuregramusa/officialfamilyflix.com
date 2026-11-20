"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Search, Settings2, UserRound } from "lucide-react";
import { useState } from "react";

import { FamilyFlixLogo } from "@/components/familyflix/logo";
import { useMyList } from "@/components/familyflix/my-list-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Movies", href: "/movies" },
  { label: "TV Shows", href: "/tv-shows" },
  { label: "My List", href: "/my-list" },
  { label: "Developers", href: "/developers" },
];

export interface HeaderUser {
  name: string;
  email: string;
  role: string | null;
}

export function SiteHeader({ user }: { user?: HeaderUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { slugs } = useMyList();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const initial = (user?.name ?? "?").trim().charAt(0).toUpperCase() || "?";

  async function signOut() {
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#08060f]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center gap-6 px-4 sm:px-6 md:px-8 xl:px-12">
        <FamilyFlixLogo />

        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "relative py-1 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-background",
                isActive(item.href)
                  ? "text-white"
                  : "text-white/55 hover:text-white/90",
              )}
            >
              {item.label}
              <span
                className={cn(
                  "absolute -bottom-[9px] left-0 h-[2px] w-full rounded-full bg-brand transition-opacity",
                  isActive(item.href) ? "opacity-100" : "opacity-0",
                )}
              />
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/search"
            aria-label="Search"
            className="grid size-10 place-items-center rounded-full text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Search className="size-[19px]" aria-hidden />
          </Link>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 pl-1 pr-2 text-[12.5px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:pr-3"
              >
                <span className="grid size-7 place-items-center rounded-full bg-brand text-[12px] font-bold text-white">
                  {initial}
                </span>
                <span className="hidden max-w-[120px] truncate sm:block">
                  {user.name}
                </span>
                {slugs.length > 0 ? (
                  <span className="grid min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-white">
                    {slugs.length}
                  </span>
                ) : null}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0c0815]">
                <DropdownMenuLabel className="text-white">
                  <span className="block truncate">{user.name}</span>
                  <span className="block truncate text-[11px] font-normal text-white/40">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild>
                  <Link href="/my-list">
                    <UserRound aria-hidden />
                    My List
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/onboarding">
                    <Settings2 aria-hidden />
                    Edit favorites
                  </Link>
                </DropdownMenuItem>
                {isStaff ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Admin</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    void signOut();
                  }}
                >
                  <LogOut aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/auth/sign-in"
              className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-3 text-[12.5px] font-semibold text-white/75 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <UserRound className="size-4" aria-hidden />
              <span className="hidden sm:inline">Sign in</span>
            </Link>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="grid size-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:hidden"
            >
              <Menu className="size-6" aria-hidden />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[86vw] border-white/10 bg-[#0c0815] px-5 pb-8 sm:max-w-sm"
            >
              <SheetHeader className="px-0 pt-2">
                <SheetTitle className="text-left">
                  <FamilyFlixLogo />
                </SheetTitle>
                <SheetDescription className="text-left text-white/45">
                  Free movies and classic films.
                </SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile" className="mt-4 flex flex-col">
                {NAV.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center justify-between border-b border-white/[0.06] py-3.5 text-[17px] font-semibold transition-colors",
                        isActive(item.href) ? "text-white" : "text-white/65",
                      )}
                    >
                      {item.label}
                      {item.href === "/my-list" && slugs.length > 0 ? (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                          {slugs.length}
                        </span>
                      ) : null}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <SheetClose asChild>
                <Link
                  href="/search"
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-hover"
                >
                  <Search className="size-4" aria-hidden />
                  Search FamilyFlix
                </Link>
              </SheetClose>
              <div className="mt-5 flex flex-col gap-2 border-t border-white/[0.06] pt-5">
                {user ? (
                  <>
                    <p className="text-[12px] font-semibold text-white/70">
                      {user.name}
                    </p>
                    <SheetClose asChild>
                      <Link
                        href="/onboarding"
                        className="text-[13px] font-semibold text-white/55 transition hover:text-white"
                      >
                        Edit favorites
                      </Link>
                    </SheetClose>
                    {isStaff ? (
                      <SheetClose asChild>
                        <Link
                          href="/admin"
                          className="text-[13px] font-semibold text-white/55 transition hover:text-white"
                        >
                          Admin
                        </Link>
                      </SheetClose>
                    ) : null}
                    <SheetClose asChild>
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 px-4 text-[13px] font-semibold text-white/75 transition hover:border-white/35 hover:text-white"
                      >
                        Sign out
                      </button>
                    </SheetClose>
                  </>
                ) : (
                  <SheetClose asChild>
                    <Link
                      href="/auth/sign-in"
                      className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-hover"
                    >
                      Sign in
                    </Link>
                  </SheetClose>
                )}
              </div>
              <p className="mt-auto text-[11px] leading-relaxed text-white/30">
                Always free. No subscription, no credit card.
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
