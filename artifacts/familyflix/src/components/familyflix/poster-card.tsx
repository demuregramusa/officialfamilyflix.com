import { Link } from "wouter";
import { Play } from "lucide-react";

import { PosterArt, WideArt } from "@/components/familyflix/art";
import { MyListButton } from "@/components/familyflix/my-list-button";
import type { Title } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

export const posterSize =
  "w-[134px] shrink-0 sm:w-[150px] md:w-[164px] lg:w-[176px] xl:w-[188px]";

function metaLine(title: Title) {
  const detail =
    title.type === "series"
      ? title.seasons
        ? `${title.seasons} ${title.seasons === 1 ? "Season" : "Seasons"}`
        : ""
      : title.type === "live"
        ? "Live now"
        : title.duration;
  return [title.year > 0 ? String(title.year) : "", title.genres?.[0], detail].filter(Boolean).join(" · ");
}

export function PosterCard({
  title,
  className,
  showCaption = true,
}: {
  title: Title;
  className?: string;
  showCaption?: boolean;
}) {
  return (
    <article className={cn("group/card relative", className)}>
      <Link
        href={title.type === "live" ? `/watch/${title.slug}` : `/title/${title.slug}`}
        className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        data-testid={`card-title-${title.slug}`}
      >
        <PosterArt title={title} />
        {title.type === "series" && (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-purple-600/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-sm border border-purple-400/30">
            TV Series
          </span>
        )}
        {title.type === "live" && (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-red-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-md backdrop-blur-sm animate-pulse">
            LIVE
          </span>
        )}
        <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />
        <span className="pointer-events-none absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 scale-90 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-black border border-amber-200/70 opacity-0 shadow-xl shadow-amber-500/50 transition duration-300 group-hover/card:scale-100 group-hover/card:opacity-100">
          <Play className="ml-0.5 size-5" fill="currentColor" aria-hidden />
        </span>
      </Link>
      <MyListButton
        slug={title.slug}
        name={title.name}
        variant="icon"
        className="absolute right-2 top-2 z-20 size-9 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 focus-visible:opacity-100"
      />
      {showCaption ? (
        <div className="mt-2.5">
          <h3 className="line-clamp-1 text-[13px] font-semibold leading-tight text-white/90">
            {title.name}
          </h3>
          <p className="mt-1 line-clamp-1 text-[11px] leading-tight text-white/45">
            {metaLine(title)}
          </p>
        </div>
      ) : null}
    </article>
  );
}

export function ContinueCard({
  title,
  progress,
  label,
}: {
  title: Title;
  progress: number;
  label: string;
}) {
  return (
    <Link
      href={`/watch/${title.slug}`}
      className="group/card block w-[260px] shrink-0 snap-start rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-[300px] lg:w-[340px]"
    >
      <div className="relative">
        <WideArt title={title} />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-12 place-items-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-md transition group-hover/card:scale-105 group-hover/card:bg-white group-hover/card:text-black">
            <Play className="ml-0.5 size-5" fill="currentColor" aria-hidden />
          </span>
        </span>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
          <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
        </div>
        <span className="absolute right-2 top-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur">
          {progress}%
        </span>
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-[13px] font-semibold text-white/90">{title.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-white/45">{label}</p>
        </div>
      </div>
    </Link>
  );
}

export function LiveCard({ title }: { title: Title }) {
  if (!title.live) return null;
  return (
    <Link
      href={`/watch/${title.slug}`}
      className="group/card block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative">
        <WideArt title={title} />
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded bg-[#f04444] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          <span className="size-1.5 rounded-full bg-white animate-live" />
          Live
        </span>
        <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover/card:opacity-100">
          <span className="grid size-11 place-items-center rounded-full bg-white/95 text-black shadow-xl">
            <Play className="ml-0.5 size-4" fill="currentColor" aria-hidden />
          </span>
        </span>
      </div>
      <div className="mt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="line-clamp-1 text-[13px] font-semibold text-white/90">{title.name}</h3>
          <span className="shrink-0 text-[11px] text-white/40">
            {title.live.endsIn}m left
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-[11px] text-white/55">
          <span className="text-white/35">On now</span> {title.live.onNow}
        </p>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white/50"
            style={{ width: `${Math.min(94, Math.max(8, 100 - title.live.endsIn))}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
