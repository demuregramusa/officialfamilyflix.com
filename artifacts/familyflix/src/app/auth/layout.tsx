import type { Metadata } from "next";
import Link from "next/link";

import { FamilyFlixLogo } from "@/components/familyflix/logo";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0c1014] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand/25 blur-[120px]"
      />
      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 flex items-center justify-between">
          <FamilyFlixLogo />
          <Link
            href="/"
            className="text-[12px] font-medium text-white/45 transition-colors hover:text-white"
          >
            Back to site
          </Link>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d0917]/90 p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur sm:p-8">
          {children}
        </div>
        <p className="mt-6 text-center text-[11px] leading-relaxed text-white/25">
          FamilyFlix · Always free. No subscription, no credit card.
        </p>
      </div>
    </div>
  );
}
