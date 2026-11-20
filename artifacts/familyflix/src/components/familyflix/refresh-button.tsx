"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

export function RefreshButton({
  label = "Refresh",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-[12px] font-semibold text-white/60 transition hover:border-white/30 hover:text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        className,
      )}
    >
      <RefreshCw
        className={cn("size-3.5", pending && "animate-spin")}
        aria-hidden
      />
      {pending ? "Refreshing…" : label}
    </button>
  );
}
