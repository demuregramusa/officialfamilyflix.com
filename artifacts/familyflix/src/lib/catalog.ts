import { importedTitles } from "@/lib/imported";
import { publicDomainFilms, toCatalogTitle } from "@/lib/public-domain";

export type TitleType = "movie" | "series" | "live";

export interface Episode {
  number: number;
  title: string;
  duration: string;
  synopsis: string;
}

export interface Title {
  slug: string;
  name: string;
  tagline: string;
  year: number;
  type: TitleType;
  rating: string;
  score: number;
  duration?: string;
  seasons?: number;
  genres: string[];
  synopsis: string;
  cast: string[];
  creator: string;
  image: string;
  poster?: string;
  backdrop?: string;
  palette: [string, string];
  badge?: string;
  featured?: boolean;
  episodes?: Episode[];
  live?: { channel: string; onNow: string; next: string; endsIn: number };
}

const unsplash = (image: string, width: number, height: number) =>
  `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&h=${height}&q=65`;

function sanitizeCatalogUrl(raw?: string | null, width = 400, height = 600): string {
  if (!raw) return `https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=${width}&h=${height}&q=65`;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("//") || raw.startsWith("/")) {
    return raw.replace("https://yts.pw/", "https://img.yts.pw/");
  }
  return unsplash(raw, width, height);
}

export const posterUrl = (title: Title) =>
  title.poster ? sanitizeCatalogUrl(title.poster, 400, 600) : sanitizeCatalogUrl(title.image, 400, 600);

export const backdropUrl = (title: Title) =>
  title.backdrop ? sanitizeCatalogUrl(title.backdrop, 1440, 810) : title.poster ? sanitizeCatalogUrl(title.poster, 1440, 810) : sanitizeCatalogUrl(title.image, 1440, 810);

export const wideUrl = (title: Title) =>
  title.backdrop ? sanitizeCatalogUrl(title.backdrop, 640, 360) : title.poster ? sanitizeCatalogUrl(title.poster, 640, 360) : sanitizeCatalogUrl(title.image, 640, 360);

/**
 * The public catalog contains only real, playable content:
 *   - Public-domain and Creative Commons films streamed from the Internet Archive.
 *   - Licensed titles imported by the site owner through the admin importer.
 */
export const titles: Title[] = [
  ...publicDomainFilms.map(toCatalogTitle),
  ...importedTitles,
];

export const featuredTitles = titles.filter((title) => title.featured);

export const movies = titles.filter((title) => title.type === "movie");
export const series = titles.filter((title) => title.type === "series");
export const liveChannels = titles.filter((title) => title.type === "live");

export const getTitle = (slug: string) => titles.find((title) => title.slug === slug);

export const getTitles = (slugs: string[]) =>
  slugs.map((slug) => getTitle(slug)).filter((title): title is Title => Boolean(title));

export const allGenres = Array.from(
  new Set(titles.flatMap((title) => title.genres)),
).sort((a, b) => a.localeCompare(b));

export const byGenre = (genre: string) =>
  titles.filter((title) => title.genres.some((item) => item === genre));

export interface Section {
  title: string;
  subtitle?: string;
  slugs: string[];
  variant?: "poster" | "wide";
}

const rankedSlugs = (pool: Title[], count: number) =>
  [...pool]
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, count)
    .map((title) => title.slug);

const withGenres = (...genres: string[]) =>
  titles.filter((title) => title.genres.some((genre) => genres.includes(genre)));

const newestImported = [...importedTitles]
  .sort((a, b) => b.year - a.year || b.score - a.score)
  .map((title) => title.slug);

const section = (
  title: string,
  subtitle: string,
  slugs: string[],
): Section | null => (slugs.length > 0 ? { title, subtitle, slugs } : null);

export const homeSections: Section[] = [
  section(
    "Trending Now",
    "The most popular films in the library right now",
    rankedSlugs(titles, 12),
  ),
  section(
    "Public Domain Classics",
    "Timeless films that belong to everyone",
    rankedSlugs(withGenres("Classics"), 12),
  ),
  section(
    "Film Noir & Crime",
    "Shadows, bad luck and one last score",
    rankedSlugs(withGenres("Noir", "Crime"), 12),
  ),
  section(
    "Classic Horror & Sci-Fi",
    "Monsters, phantoms and things from other worlds",
    rankedSlugs(withGenres("Horror", "Sci-Fi"), 12),
  ),
  section(
    "Westerns",
    "Saddle up with the old frontier",
    rankedSlugs(withGenres("Western"), 12),
  ),
  section(
    "Family Matinee",
    "Adventure for every age",
    rankedSlugs(withGenres("Family", "Adventure"), 12),
  ),
  section(
    "Comedy Classics",
    "A little lighter on the way out",
    rankedSlugs(withGenres("Comedy"), 12),
  ),
  section(
    "Romance & Drama",
    "Big feelings, bigger performances",
    rankedSlugs(withGenres("Romance", "Drama"), 12),
  ),
  section(
    "Newly Added",
    "Fresh arrivals, ready to stream",
    newestImported.slice(0, 12),
  ),
].filter((value): value is Section => Boolean(value));

export const relatedTitles = (title: Title, limit = 8) => {
  const scored = titles
    .filter((item) => item.slug !== title.slug && item.type !== "live")
    .map((item) => ({
      item,
      score:
        item.genres.filter((genre) => title.genres.includes(genre)).length * 10 +
        (item.type === title.type ? 3 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item.slug);
  return scored.slice(0, limit);
};

const SEARCH_ALIASES: Record<string, string> = {
  "true crime": "crime",
  "tv shows": "series",
  "tv show": "series",
  movies: "movie",
  kids: "family",
};

export const searchCatalog = (query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const needle = SEARCH_ALIASES[normalized] ?? normalized;
  return titles.filter((title) =>
    [
      title.name,
      title.synopsis,
      title.tagline,
      title.genres.join(" "),
      title.cast.join(" "),
      title.creator,
      title.badge ?? "",
      title.type,
      title.rating,
      title.live?.channel ?? "",
      title.live?.onNow ?? "",
      title.live?.next ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
};

export const popularSearches = [
  "Thriller",
  "Comedy",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Western",
  "Film Noir",
  "Classics",
];
