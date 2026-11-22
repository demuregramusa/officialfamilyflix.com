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
        className="brand-mark grid shrink-0 place-items-center rounded-[10px] bg-brand shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),0_6px_16px_-6px_rgba(109,40,255,0.9)]"
      >
        <BrandLogo className="ml-0.5 text-white" />
      </span>
      <span className="brand-word text-[24px] font-black leading-none tracking-[-0.055em] text-white">
        family<b className="text-[#a78bfa]">flix</b>
      </span>
    </Link>
  );
}
