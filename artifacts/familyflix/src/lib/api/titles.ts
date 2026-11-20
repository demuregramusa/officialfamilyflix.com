import {
  backdropUrl,
  posterUrl,
  searchCatalog,
  titles,
  type Title,
} from "@/lib/catalog";
import { importedBySlug } from "@/lib/imported";
import { publicDomainBySlug } from "@/lib/public-domain";
import { site } from "@/lib/site";

export type ApiLicenseType =
  | "public_domain"
  | "creative_commons"
  | "licensed"
  | "owned"
  | "proprietary";

export interface ApiLicense {
  type: ApiLicenseType;
  rightsHolder: string;
  sourceUrl: string | null;
}

export interface ApiTitle {
  slug: string;
  name: string;
  tagline: string;
  synopsis: string;
  year: number;
  type: Title["type"];
  rating: string;
  score: number;
  duration: string | null;
  seasons: number | null;
  episodes: number | null;
  genres: string[];
  cast: string[];
  creator: string;
  badge: string | null;
  featured: boolean;
  embeddable: boolean;
  images: {
    poster: string;
    backdrop: string;
  };
  links: {
    page: string;
    embed: string;
    trailerEmbed: string;
    playback: string;
  };
  license: ApiLicense;
}

export function licenseFor(title: Title): ApiLicense {
  const publicDomain = publicDomainBySlug.get(title.slug);
  if (publicDomain) {
    return {
      type: publicDomain.license,
      rightsHolder: "Public domain",
      sourceUrl: publicDomain.sourceUrl,
    };
  }

  const imported = importedBySlug.get(title.slug);
  if (imported) {
    return {
      type: imported.license,
      rightsHolder: imported.rightsHolder,
      sourceUrl: imported.sourceUrl || null,
    };
  }

  return {
    type: "proprietary",
    rightsHolder: site.legalName,
    sourceUrl: null,
  };
}

export function toApiTitle(title: Title, origin: string): ApiTitle {
  const base = origin.replace(/\/$/, "");
  const path = encodeURIComponent(title.slug);

  return {
    slug: title.slug,
    name: title.name,
    tagline: title.tagline,
    synopsis: title.synopsis,
    year: title.year,
    type: title.type,
    rating: title.rating,
    score: title.score,
    duration: title.duration ?? null,
    seasons: title.seasons ?? null,
    episodes: title.episodes?.length ?? null,
    genres: title.genres,
    cast: title.cast,
    creator: title.creator,
    badge: title.badge ?? null,
    featured: Boolean(title.featured),
    embeddable: title.type !== "live",
    images: {
      poster: posterUrl(title),
      backdrop: backdropUrl(title),
    },
    links: {
      page: `${base}/title/${path}`,
      embed: `${base}/embed/${path}`,
      trailerEmbed: `${base}/embed/${path}/trailer`,
      playback: `${base}/api/playback/${path}`,
    },
    license: licenseFor(title),
  };
}

const SORTERS: Record<string, (a: Title, b: Title) => number> = {
  score: (a, b) => b.score - a.score || a.name.localeCompare(b.name),
  newest: (a, b) => b.year - a.year || b.score - a.score,
  oldest: (a, b) => a.year - b.year || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name),
};

export const API_SORTS = Object.keys(SORTERS);

export interface TitleQuery {
  type?: string;
  genre?: string;
  q?: string;
  sort?: string;
  limit: number;
  offset: number;
}

export function queryTitles({
  type,
  genre,
  q,
  sort = "score",
  limit,
  offset,
}: TitleQuery) {
  let rows = titles;

  if (type) rows = rows.filter((title) => title.type === type);

  if (genre) {
    const needle = genre.toLowerCase();
    rows = rows.filter((title) =>
      title.genres.some((value) => value.toLowerCase() === needle),
    );
  }

  if (q) {
    const matches = new Set(searchCatalog(q).map((title) => title.slug));
    rows = rows.filter((title) => matches.has(title.slug));
  }

  const sorter = SORTERS[sort] ?? SORTERS.score;
  const sorted = [...rows].sort(sorter);

  return {
    items: sorted.slice(offset, offset + limit),
    total: sorted.length,
  };
}
