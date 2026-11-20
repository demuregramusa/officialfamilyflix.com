"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#a68bff]">
          Something interrupted the stream
        </p>
        <h1 className="mt-3 text-[28px] font-black tracking-[-0.03em] text-white">
          That did not play as expected
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-white/45">
          Try the page again. If it keeps happening, head back home and pick
          something else to watch.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-[13px] font-semibold text-white/75 transition hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
