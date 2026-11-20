import Link from "next/link";
import { ChevronRight, Radio } from "lucide-react";

import { BrowseHeader } from "@/components/familyflix/browse";
import { LiveCard } from "@/components/familyflix/poster-card";
import { RefreshButton } from "@/components/familyflix/refresh-button";
import { liveChannels } from "@/lib/catalog";

export const metadata = { title: "Live TV" };

export default function LivePage() {
  return (
    <>
      <BrowseHeader
        eyebrow="FamilyFlix Live"
        title="Live TV"
        description="Always-on channels appear here as licensed linear streams are added to the library."
        count={liveChannels.length}
        countLabel="channels"
      />

      <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-7 sm:px-6 md:px-8 xl:px-12">
        {liveChannels.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-white/[0.06] text-white/45">
              <Radio className="size-5" aria-hidden />
            </div>
            <h2 className="mt-4 text-[20px] font-bold text-white">
              No live channels yet
            </h2>
            <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-white/45">
              Live TV channels will show up here as soon as licensed linear
              streams are added to the library.
            </p>
            <Link
              href="/movies"
              className="mt-6 inline-flex h-10 items-center rounded-full bg-brand px-5 text-[13px] font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Browse movies
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-x-3 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {liveChannels.map((channel) => (
                <LiveCard key={channel.slug} title={channel} />
              ))}
            </div>

            <section aria-labelledby="guide-heading" className="mt-14">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    id="guide-heading"
                    className="text-[19px] font-bold tracking-[-0.02em] text-white md:text-[22px]"
                  >
                    Live guide
                  </h2>
                  <p className="mt-0.5 text-[12.5px] text-white/45">
                    See what is playing right now across every channel.
                  </p>
                </div>
                <RefreshButton label="Refresh guide" />
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08]">
                <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_120px] gap-4 border-b border-white/[0.08] bg-white/[0.03] px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white/35 md:grid">
                  <span>Channel</span>
                  <span>On now</span>
                  <span>Up next</span>
                  <span className="text-right">Progress</span>
                </div>
                <ul className="divide-y divide-white/[0.06]">
                  {liveChannels.map((channel) => {
                    const live = channel.live;
                    if (!live) return null;
                    const progress = Math.min(94, Math.max(8, 100 - live.endsIn));
                    return (
                      <li key={channel.slug}>
                        <Link
                          href={`/watch/${channel.slug}`}
                          className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:px-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_120px]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-white/[0.06] text-white/50">
                              <Radio className="size-4" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-white">
                                {channel.name}
                                <span className="rounded bg-[#f04444] px-1 py-px text-[8.5px] font-bold uppercase tracking-wider text-white">
                                  Live
                                </span>
                              </p>
                              <p className="mt-0.5 truncate text-[11px] text-white/40 md:hidden">
                                {live.onNow}
                              </p>
                            </div>
                          </div>
                          <div className="hidden min-w-0 md:block">
                            <p className="truncate text-[13px] text-white/80">{live.onNow}</p>
                          </div>
                          <div className="hidden min-w-0 md:block">
                            <p className="truncate text-[12.5px] text-white/45">{live.next}</p>
                          </div>
                          <div className="hidden items-center justify-end gap-2 md:flex">
                            <span className="text-[11px] font-medium tabular-nums text-white/50">
                              {live.endsIn}m left
                            </span>
                            <ChevronRight
                              className="size-4 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white"
                              aria-hidden
                            />
                          </div>
                          <div className="flex items-center gap-2 md:hidden">
                            <span className="text-[11px] font-medium tabular-nums text-white/45">
                              {live.endsIn}m
                            </span>
                            <ChevronRight className="size-4 text-white/25" aria-hidden />
                          </div>
                          <div className="col-span-2 -mt-1 md:hidden">
                            <div className="h-[3px] overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-white/45"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
