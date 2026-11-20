import raw from "./imported-titles.json";

export type ImportedLicense =
  | "licensed"
  | "public_domain"
  | "creative_commons"
  | "owned";

/**
 * Catalog entry produced by the admin importer (`/admin/import`) or
 * `bun run import:licensed`.
 *
 * The importer writes the title to the database and stores a catalog snapshot
 * here so the public browse pages can render it without a database read.
 */
export interface ImportedTitle {
  slug: string;
  name: string;
  tagline: string;
  year: number;
  type: "movie" | "series";
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
  mp4Url?: string;
  hlsUrl?: string;
  rightsHolder: string;
  license: ImportedLicense;
  sourceUrl: string;
  tmdbId?: number;
}

export const importedTitles = raw as ImportedTitle[];

export const importedBySlug = new Map(
  importedTitles.map((title) => [title.slug, title]),
);
