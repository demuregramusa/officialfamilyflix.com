import Link from "next/link";

import { FamilyFlixLogo } from "@/components/familyflix/logo";

export function NotFoundContent() {
  return (
    <div className="mx-auto flex min-h-[68vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <FamilyFlixLogo className="mb-8" />
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#a68bff]">
        Error 404
      </p>
      <h1 className="mt-3 text-[32px] font-black leading-tight tracking-[-0.04em] text-white sm:text-[40px]">
        This page went off air
      </h1>
      <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-white/45">
        The title you are looking for may have left the catalog, or the link is
        wrong. There is still plenty to watch.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Back to home
        </Link>
        <Link
          href="/movies"
          className="inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-[13px] font-semibold text-white/75 transition hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Browse movies
        </Link>
      </div>
    </div>
  );
}
