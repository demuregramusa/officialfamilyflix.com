import { backdropUrl, posterUrl, wideUrl } from "@/lib/art-utils";
import type { Title } from "@/lib/catalog";
import { cn } from "@/lib/utils";

function badgeText(title: Title) {
  if (title.type === "live") return "Live";
  if (title.badge) return title.badge;
  if (title.year >= 2025) return "New";
  return null;
}

export function PosterArt({
  title,
  className,
  compact = false,
}: {
  title: Title;
  className?: string;
  compact?: boolean;
}) {
  const badge = badgeText(title);

  return (
    <div
      className={cn(
        "grain relative isolate aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#120e1d]",
        className,
      )}
      style={{ containerType: "inline-size" }}
    >
      <div
        className="absolute inset-0 scale-[1.02] bg-cover bg-center transition-transform duration-[900ms] ease-out group-hover:scale-[1.09]"
        style={{ backgroundImage: `url("${posterUrl(title)}")` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${title.palette[0]}14 0%, transparent 34%, ${title.palette[0]}b8 70%, #050309 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-40 mix-blend-soft-light"
        style={{
          background: `linear-gradient(150deg, ${title.palette[1]} 0%, transparent 56%)`,
        }}
      />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-[7%]">
        {badge ? (
          <span
            className={cn(
              "rounded-[4px] px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none tracking-[0.14em] backdrop-blur-sm",
              title.type === "live"
                ? "bg-[#f04444] text-white"
                : title.badge
                  ? "bg-white text-black"
                  : "bg-white/15 text-white",
            )}
            style={{ fontSize: compact ? "min(9px, 5.6cqw)" : "min(10px, 5.4cqw)" }}
          >
            {badge}
          </span>
        ) : (
          <span />
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-[4%] p-[7%]">
        <p
          className="font-semibold uppercase tracking-[0.18em] text-white/65"
          style={{ fontSize: "min(9px, 4.1cqw)" }}
        >
          {title.genres[0]}
          <span className="mx-1 opacity-50">·</span>
          {title.year}
        </p>
        <h3
          className="text-balance font-black uppercase leading-[0.86] tracking-[-0.045em] text-white"
          style={{ fontSize: "min(34px, 13.4cqw)" }}
        >
          {title.name}
        </h3>
      </div>
    </div>
  );
}

export function BackdropArt({
  title,
  className,
  animate = false,
}: {
  title: Title;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div className={cn("grain absolute inset-0 isolate overflow-hidden bg-ink", className)}>
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center",
          animate && "animate-soft-zoom",
        )}
        style={{ backgroundImage: `url("${backdropUrl(title)}")` }}
      />
      <div
        className="absolute inset-0 opacity-55 mix-blend-soft-light"
        style={{
          background: `linear-gradient(125deg, ${title.palette[0]} 0%, transparent 55%, ${title.palette[1]} 100%)`,
        }}
      />
      <div className="absolute inset-0 hero-fade-bottom" />
    </div>
  );
}

export function WideArt({
  title,
  className,
  animate = false,
}: {
  title: Title;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div
      className={cn(
        "grain relative isolate aspect-video w-full overflow-hidden rounded-xl bg-[#120e1d]",
        className,
      )}
      style={{ containerType: "inline-size" }}
    >
      <div
        className={cn(
          "absolute inset-0 bg-cover bg-center transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]",
          animate && "animate-soft-zoom",
        )}
        style={{ backgroundImage: `url("${wideUrl(title)}")` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${title.palette[0]}0d 0%, transparent 35%, #050309e6 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-35 mix-blend-soft-light"
        style={{
          background: `linear-gradient(120deg, ${title.palette[1]} 0%, transparent 58%)`,
        }}
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-[2.5%] p-[5%]">
        <p
          className="font-semibold uppercase tracking-[0.18em] text-white/65"
          style={{ fontSize: "min(10px, 2.4cqw)" }}
        >
          {title.type === "live" ? title.live?.channel : title.genres[0]}
        </p>
        <h3
          className="line-clamp-1 font-black uppercase leading-none tracking-[-0.04em] text-white"
          style={{ fontSize: "min(26px, 5.4cqw)" }}
        >
          {title.name}
        </h3>
      </div>
    </div>
  );
}

export function PosterImage({
  title,
  className,
}: {
  title: Title;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grain relative isolate aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#120e1d]",
        className,
      )}
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${posterUrl(title)}")` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, transparent 45%, ${title.palette[0]}55 72%, #050309e0 100%)`,
        }}
      />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
          {title.type === "series" ? "Series" : "Movie"}
        </p>
      </div>
    </div>
  );
}
