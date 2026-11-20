import Link from "next/link";
import { Play } from "lucide-react";

import { cn } from "@/lib/utils";

export function FamilyFlixLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="FamilyFlix home"
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-sm leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-[27px] shrink-0 place-items-center rounded-[7px] bg-brand shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),0_6px_16px_-6px_rgba(109,40,255,0.9)]"
      >
        <Play className="ml-0.5 size-[13px] text-white" fill="currentColor" />
      </span>
      <span className="text-[24px] font-black leading-none tracking-[-0.055em] text-white">
        family<span className="text-[#a78bfa]">flix</span>
      </span>
    </Link>
  );
}
