import Link from "next/link";
import { Play } from "lucide-react";

import { wideUrl, type Title } from "@/lib/catalog";

export function EpisodeList({ title }: { title: Title }) {
  if (!title.episodes?.length) return null;

  return (
    <section aria-labelledby="episodes-heading" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="episodes-heading"
            className="text-[19px] font-bold tracking-[-0.02em] text-white md:text-[22px]"
          >
            Episodes
          </h2>
          <p className="mt-0.5 text-[12.5px] text-white/45">
            Season 1 · {title.episodes.length} episodes
          </p>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold text-white/55">
          {title.seasons} {title.seasons === 1 ? "Season" : "Seasons"} available
        </span>
      </div>

      <ul className="mt-4 divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.015]">
        {title.episodes.map((episode) => (
          <li key={episode.number}>
            <Link
              href={`/watch/${title.slug}`}
              className="group flex gap-3 p-3 transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:gap-4 sm:p-4"
            >
              <span className="relative block aspect-video w-[132px] shrink-0 overflow-hidden rounded-lg bg-[#120e1d] sm:w-[168px]">
                <span
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url("${wideUrl(title)}")` }}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" />
                <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white/90 backdrop-blur">
                  E{episode.number}
                </span>
                <span className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                  <span className="grid size-9 place-items-center rounded-full bg-white/95 text-black">
                    <Play className="ml-0.5 size-3.5" fill="currentColor" aria-hidden />
                  </span>
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-[11px] font-bold tabular-nums text-white/35">
                    {episode.number}
                  </span>
                  <span className="line-clamp-1 text-[13.5px] font-semibold text-white/90 group-hover:text-white">
                    {episode.title}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] tabular-nums text-white/35">
                    {episode.duration}
                  </span>
                </span>
                <span className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-white/45">
                  {episode.synopsis}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
