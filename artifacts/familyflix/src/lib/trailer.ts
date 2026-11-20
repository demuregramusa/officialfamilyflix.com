import { getTitle } from "@/lib/catalog";
import { importedBySlug } from "@/lib/imported";
import { publicDomainBySlug } from "@/lib/public-domain";
import { getTmdbDetails, searchTmdb, tmdbConfigured } from "@/lib/video/tmdb";

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const HIT_TTL = 24 * 60 * 60 * 1000;
const MISS_TTL = 60 * 60 * 1000;

export function youtubeId(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.replace(/^\//, "") || null;
    }
    if (parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.slice("/embed/".length) || null;
    }
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

export function trailerEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
    videoId,
  )}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
}

/**
 * Resolves an official trailer for a movie through TMDb. Only exact
 * title + year matches are trusted, so an unrelated film with the same name
 * is never attached to our catalog. Results are cached per server instance.
 */
export async function getTrailerVideoId(slug: string): Promise<string | null> {
  const title = getTitle(slug);
  if (!title || title.type !== "movie") return null;

  const cached = cache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value: string | null = null;

  if (tmdbConfigured()) {
    try {
      const imported = importedBySlug.get(slug);
      if (imported?.tmdbId) {
        value = youtubeId(
          (await getTmdbDetails("movie", imported.tmdbId)).trailerUrl,
        );
      } else if (publicDomainBySlug.has(slug)) {
        const matches = await searchTmdb(title.name, "movie");
        const match = matches.find((item) => item.year === title.year);
        if (match) {
          value = youtubeId(
            (await getTmdbDetails("movie", match.tmdbId)).trailerUrl,
          );
        }
      }
    } catch {
      value = null;
    }
  }

  cache.set(slug, {
    value,
    expiresAt: Date.now() + (value ? HIT_TTL : MISS_TTL),
  });
  return value;
}
