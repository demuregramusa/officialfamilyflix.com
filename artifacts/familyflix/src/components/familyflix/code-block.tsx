"use client";

import { AlertCircle, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copying" | "copied" | "error";

export function CodeBlock({
  code,
  label = "Example",
}: {
  code: string;
  label?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    setState("copying");
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#06040b]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-2">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/35">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-live="polite"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 px-3 text-[11px] font-semibold text-white/60 transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {state === "copied" ? (
            <>
              <Check className="size-3.5" aria-hidden />
              Copied
            </>
          ) : state === "copying" ? (
            <>
              <span className="size-3 animate-spin rounded-full border border-white/25 border-t-white" />
              Copying…
            </>
          ) : state === "error" ? (
            <>
              <AlertCircle className="size-3.5" aria-hidden />
              Copy failed
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed text-white/70">
        <code>{code}</code>
      </pre>
    </div>
  );
}
