"use client";

import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import { useMyList } from "@/components/familyflix/my-list-provider";
import { cn } from "@/lib/utils";

export function MyListButton({
  slug,
  name,
  variant = "button",
  className,
}: {
  slug: string;
  name: string;
  variant?: "button" | "icon";
  className?: string;
}) {
  const { has, toggle, hydrated } = useMyList();
  const saved = hydrated && has(slug);
  const Icon = saved ? Check : Plus;

  function handleClick() {
    const added = toggle(slug);
    if (added) {
      toast.success("Added to My List", { description: name });
    } else {
      toast("Removed from My List", { description: name });
    }
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={saved ? `Remove ${name} from My List` : `Add ${name} to My List`}
        aria-pressed={saved}
        className={cn(
          "grid size-10 place-items-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition hover:scale-105 hover:border-white/40 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          className,
        )}
      >
        <Icon className="size-4" strokeWidth={2.5} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <Icon className="size-4" strokeWidth={2.5} aria-hidden />
      {saved ? "In My List" : "My List"}
    </button>
  );
}
