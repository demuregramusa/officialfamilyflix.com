import { useState, useEffect } from "react";
import { Film } from "lucide-react";
import { backdropUrl, posterUrl, wideUrl } from "@/lib/art-utils";
import type { Title } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

const DEFAULT_PALETTE: [string, string] = ["#12161b", "#7c3aed"];

function getPalette(title?: Partial<Title> | null): [string, string] {
  if (title?.palette && Array.isArray(title.palette) && title.palette.length >= 2) {
    return [title.palette[0] || DEFAULT_PALETTE[0], title.palette[1] || DEFAULT_PALETTE[1]];
  }
  return DEFAULT_PALETTE;
}

function badgeText(title: Partial<Title>) {
  if (title.type === "live") return "Live";
  if (title.badge) return title.badge;
  if (title.year && title.year >= 2025) return "New";
  return null;
}

export function PosterArt({
  title,
  className,
}: {
  title: Title;
  className?: string;
  compact?: boolean;
}) {
  const badge = badgeText(title);
  const [, p1] = getPalette(title);
  const url = posterUrl(title);
  const [imgSrc, setImgSrc] = useState(url);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(url);
    setHasError(false);
  }, [url]);

  const handleImageError = () => {
    if (imgSrc && imgSrc.startsWith("https://img.yts.pw/")) {
      setImgSrc(`/api/v1/image-proxy?url=${encodeURIComponent(imgSrc)}`);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      className={cn(
        "relative isolate aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#12161b] shadow-md ring-1 ring-white/10 transition-all duration-300 group-hover/card:shadow-2xl group-hover/card:ring-white/25",
        className,
      )}
    >
      {/* Crisp Poster Image Artwork */}
      {!hasError && imgSrc ? (
        <img
          src={imgSrc}
          alt={title.name || "Movie poster"}
          loading="lazy"
          onError={handleImageError}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-105"
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col justify-between p-3.5 transition-transform duration-500 ease-out group-hover/card:scale-105"
          style={{
            background: `radial-gradient(circle at 75% 20%, ${p1}45, transparent 65%), linear-gradient(145deg, #1e1333 0%, #0c0816 100%)`,
          }}
        >
          <div className="flex items-center justify-between text-white/40">
            <Film size={15} />
            <span className="text-[9px] font-bold uppercase tracking-wider">
              {title.type === "series" ? "Series" : "Movie"}
            </span>
          </div>
          <div>
            <p className="line-clamp-2 text-xs font-black text-white/90 leading-tight">
              {title.name}
            </p>
            {title.year > 0 && (
              <span className="text-[10px] text-white/50">{title.year}</span>
            )}
          </div>
        </div>
      )}

      {/* Subtle border shadow to keep artwork edge clean */}
      <div className="absolute inset-0 ring-1 ring-inset ring-black/20 rounded-xl pointer-events-none" />

      {/* Subtle bottom vignette only on hover for play button contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 pointer-events-none" />

      {/* Top Left Badge (e.g. LIVE, NEW) */}
      {badge ? (
        <div className="absolute left-2 top-2 z-10 pointer-events-none">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-md backdrop-blur-md",
              title.type === "live"
                ? "bg-[#f04444] text-white"
                : title.badge
                  ? "bg-white text-black"
                  : "bg-purple-600/90 text-white border border-purple-400/30",
            )}
          >
            {badge}
          </span>
        </div>
      ) : null}
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
  const [p0, p1] = getPalette(title);
  const url = backdropUrl(title);
  const [imgSrc, setImgSrc] = useState(url);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(url);
    setHasError(false);
  }, [url]);

  const handleImageError = () => {
    if (imgSrc && imgSrc.startsWith("https://img.yts.pw/")) {
      setImgSrc(`/api/v1/image-proxy?url=${encodeURIComponent(imgSrc)}`);
    } else {
      setHasError(true);
    }
  };

  return (
    <div className={cn("grain absolute inset-0 isolate overflow-hidden bg-ink", className)}>
      {!hasError && imgSrc ? (
        <img
          src={imgSrc}
          alt={title.name || "Cinema backdrop"}
          onError={handleImageError}
          className={cn(
            "absolute inset-0 size-full object-cover",
            animate && "animate-soft-zoom",
          )}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 65% 35%, ${p1}45, transparent 65%), linear-gradient(135deg, #100b1a, #1f1238, #0a0612)`,
          }}
        />
      )}
      <div
        className="absolute inset-0 opacity-55 mix-blend-soft-light pointer-events-none"
        style={{
          background: `linear-gradient(125deg, ${p0} 0%, transparent 55%, ${p1} 100%)`,
        }}
      />
      <div className="absolute inset-0 hero-fade-bottom pointer-events-none" />
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
  const [, p1] = getPalette(title);
  const url = wideUrl(title);
  const [imgSrc, setImgSrc] = useState(url);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(url);
    setHasError(false);
  }, [url]);

  const handleImageError = () => {
    if (imgSrc && imgSrc.startsWith("https://img.yts.pw/")) {
      setImgSrc(`/api/v1/image-proxy?url=${encodeURIComponent(imgSrc)}`);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      className={cn(
        "relative isolate aspect-video w-full overflow-hidden rounded-xl bg-[#12161b] shadow-md ring-1 ring-white/10 transition-all duration-300 group-hover/card:shadow-2xl group-hover/card:ring-white/25",
        className,
      )}
    >
      {!hasError && imgSrc ? (
        <img
          src={imgSrc}
          alt={title.name || "Artwork"}
          loading="lazy"
          onError={handleImageError}
          className={cn(
            "absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-105",
            animate && "animate-soft-zoom",
          )}
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col justify-end p-3.5"
          style={{
            background: `radial-gradient(circle at 75% 20%, ${p1}45, transparent 65%), linear-gradient(145deg, #181126 0%, #0d0817 100%)`,
          }}
        >
          <p className="line-clamp-1 text-xs font-black text-white/90">{title.name}</p>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
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
  const [p0, p1] = getPalette(title);
  const [hasError, setHasError] = useState(false);
  const url = posterUrl(title);

  return (
    <div
      className={cn(
        "grain relative isolate aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#12161b]",
        className,
      )}
    >
      {!hasError && url ? (
        <img
          src={url}
          alt={title.name || "Poster"}
          loading="lazy"
          onError={() => setHasError(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col justify-between p-3.5"
          style={{
            background: `radial-gradient(circle at 75% 20%, ${p1}45, transparent 65%), linear-gradient(145deg, #181126 0%, #0d0817 100%)`,
          }}
        >
          <Film size={18} className="text-white/40" />
          <p className="line-clamp-2 text-xs font-black text-white/90">{title.name}</p>
        </div>
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, transparent 45%, ${p0}55 72%, #050309e0 100%)`,
        }}
      />
      <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
          {title.type === "series" ? "Series" : "Movie"}
        </p>
      </div>
    </div>
  );
}
