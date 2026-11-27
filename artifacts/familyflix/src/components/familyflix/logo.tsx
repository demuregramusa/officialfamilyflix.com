import type { SVGProps } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export interface BrandLogoProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

export function BrandLogo({ className, ...props }: BrandLogoProps) {
  return (
    <svg
      className={cn("brand-logo lucide lucide-play", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="currentColor" />
    </svg>
  );
}

export function FamilyFlixLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="FamilyFlix home"
      className={cn(
        "inline-flex shrink-0 items-center gap-2.5 rounded-sm leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[10px] shadow-[0_6px_18px_rgba(0,149,246,0.28)]"
      >
        <img src="/icon-192.png" alt="" className="size-full object-cover" />
      </span>
      <span className="brand-word text-[22px] font-extrabold leading-none tracking-[-0.03em] text-[#f5f5f5]">
        family<b className="text-[#0095f6]">flix</b>
      </span>
    </Link>
  );
}
