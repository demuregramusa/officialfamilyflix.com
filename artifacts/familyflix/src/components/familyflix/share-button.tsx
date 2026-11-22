import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export function ShareButton({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied", { description: `Share ${name} with a friend.` });
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Could not copy the link", {
        description: "Copy the address from your browser instead.",
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Share ${name}`}
      className={cn(
        "grid size-10 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition hover:border-white/50 hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400",
      )}
    >
      {copied ? (
        <Check className="size-4" strokeWidth={2.5} aria-hidden />
      ) : (
        <Share2 className="size-4" aria-hidden />
      )}
    </button>
  );
}
