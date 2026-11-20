const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export const TMDB_ATTRIBUTION =
  "This product uses the TMDB API but is not endorsed or certified by TMDB.";

export type TmdbImageSize = "w185" | "w342" | "w500" | "w780" | "w1280" | "original";

export function tmdbImage(
  path: string | null | undefined,
  size: TmdbImageSize = "w500",
) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${IMAGE_BASE}/${size}${path}`;
}

export type TmdbListKind =
  | "trending_day"
  | "trending_week"
  | "popular"
  | "now_playing"
  | "upcoming"
  | "top_rated";

const LIST_PATHS: Record<TmdbListKind, string> = {
  trending_day: "/trending/movie/day",
  trending_week: "/trending/movie/week",
  popular: "/movie/popular",
  now_playing: "/movie/now_playing",
  upcoming: "/movie/upcoming",
  top_rated: "/movie/top_rated",
};

interface TmdbListResponse {
  page?: number;
  total_pages?: number;
  results?: {
    id: number;
    title?: string;
    overview?: string;
    release_date?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    vote_average?: number;
    genre_ids?: number[];
  }[];
}

export interface TmdbListItem {
  tmdbId: number;
  name: string;
  year: number | null;
  releaseDate: string;
  synopsis: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number | null;
  genreIds: number[];
}

export interface TmdbListResult {
  page: number;
  totalPages: number;
  items: TmdbListItem[];
}

function toListItem(result: NonNullable<TmdbListResponse["results"]>[number]): TmdbListItem {
  return {
    tmdbId: result.id,
    name: result.title ?? "Untitled",
    year: Number((result.release_date ?? "").slice(0, 4)) || null,
    releaseDate: result.release_date ?? "",
    synopsis: result.overview ?? "",
    posterUrl: tmdbImage(result.poster_path, "w500"),
    backdropUrl: tmdbImage(result.backdrop_path, "w1280"),
    voteAverage: typeof result.vote_average === "number" ? result.vote_average : null,
    genreIds: result.genre_ids ?? [],
  };
}

export async function getTmdbList(
  kind: TmdbListKind,
  page = 1,
): Promise<TmdbListResult> {
  const payload = await tmdbFetch<TmdbListResponse>(LIST_PATHS[kind], {
    language: "en-US",
    page: String(page),
  });
  return {
    page: payload.page ?? page,
    totalPages: payload.total_pages ?? 1,
    items: (payload.results ?? []).map(toListItem),
  };
}

export interface TmdbDiscoverOptions {
  page?: number;
  sortBy?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  genreId?: number;
  minVotes?: number;
}

export async function discoverTmdb({
  page = 1,
  sortBy = "popularity.desc",
  year,
  yearFrom,
  yearTo,
  genreId,
  minVotes,
}: TmdbDiscoverOptions = {}): Promise<TmdbListResult> {
  const params: Record<string, string> = {
    language: "en-US",
    page: String(page),
    sort_by: sortBy,
    include_adult: "false",
    "vote_count.gte": String(minVotes ?? 40),
  };
  if (year) params["primary_release_year"] = String(year);
  if (yearFrom) params["primary_release_date.gte"] = `${yearFrom}-01-01`;
  if (yearTo) params["primary_release_date.lte"] = `${yearTo}-12-31`;
  if (genreId) params.with_genres = String(genreId);

  const payload = await tmdbFetch<TmdbListResponse>("/discover/movie", params);
  return {
    page: payload.page ?? page,
    totalPages: payload.total_pages ?? 1,
    items: (payload.results ?? []).map(toListItem),
  };
}

export async function getTmdbGenres() {
  const payload = await tmdbFetch<{ genres?: { id: number; name: string }[] }>(
    "/genre/movie/list",
    { language: "en-US" },
  );
  return payload.genres ?? [];
}

export function tmdbConfigured() {
  return Boolean(process.env.TMDB_API_KEY || process.env.TMDB_READ_ACCESS_TOKEN);
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const token = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!token && process.env.TMDB_API_KEY) {
    url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  }

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "TMDb rejected the API key. Check TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN."
        : `TMDb request failed (${response.status}).`,
    );
  }

  return (await response.json()) as T;
}

interface TmdbSearchResponse {
  results?: {
    id: number;
    title?: string;
    name?: string;
    overview?: string;
    release_date?: string;
    first_air_date?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    vote_average?: number;
  }[];
}

export interface TmdbCandidate {
  tmdbId: number;
  name: string;
  year: number | null;
  synopsis: string;
  posterUrl: string | null;
  backdropUrl: string | null;
  voteAverage: number | null;
}

export async function searchTmdb(
  query: string,
  kind: "movie" | "series",
): Promise<TmdbCandidate[]> {
  const path = kind === "movie" ? "/search/movie" : "/search/tv";
  const payload = await tmdbFetch<TmdbSearchResponse>(path, {
    query,
    include_adult: "false",
    language: "en-US",
  });

  return (payload.results ?? []).slice(0, 12).map((result) => ({
    tmdbId: result.id,
    name: result.title ?? result.name ?? "Untitled",
    year: Number((result.release_date ?? result.first_air_date ?? "").slice(0, 4)) || null,
    synopsis: result.overview ?? "",
    posterUrl: result.poster_path ? `${IMAGE_BASE}/w500${result.poster_path}` : null,
    backdropUrl: result.backdrop_path ? `${IMAGE_BASE}/w1280${result.backdrop_path}` : null,
    voteAverage: typeof result.vote_average === "number" ? result.vote_average : null,
  }));
}

interface TmdbMovieDetails {
  id: number;
  title: string;
  tagline?: string;
  overview?: string;
  release_date?: string;
  runtime?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: { name: string }[];
  vote_average?: number;
  videos?: {
    results?: { key: string; site: string; type: string; official?: boolean }[];
  };
  credits?: { cast?: { name: string }[]; crew?: { job?: string; name: string }[] };
  release_dates?: {
    results?: {
      iso_3166_1?: string;
      release_dates?: { certification?: string }[];
    }[];
  };
}

interface TmdbTvDetails {
  id: number;
  name: string;
  tagline?: string;
  overview?: string;
  first_air_date?: string;
  episode_run_time?: number[];
  number_of_seasons?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genres?: { name: string }[];
  vote_average?: number;
  created_by?: { name: string }[];
  credits?: { cast?: { name: string }[] };
  content_ratings?: {
    results?: { iso_3166_1?: string; rating?: string }[];
  };
}

export interface TmdbDetails {
  tmdbId: number;
  name: string;
  tagline: string;
  synopsis: string;
  year: number | null;
  rating: string;
  durationMinutes: number | null;
  seasons: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  genres: string[];
  cast: string[];
  creator: string;
  voteAverage: number | null;
  trailerUrl: string | null;
}

function optionalRating(value?: string) {
  if (!value || value === "NR" || value === "Not Rated") return "";
  return value;
}

export async function getTmdbDetails(
  kind: "movie" | "series",
  id: number,
): Promise<TmdbDetails> {
  if (kind === "movie") {
    const data = await tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, {
      append_to_response: "credits,release_dates,videos",
      language: "en-US",
    });
    const usRelease = data.release_dates?.results?.find(
      (entry) => entry.iso_3166_1 === "US",
    );
    const certification =
      usRelease?.release_dates?.map((entry) => entry.certification).find(Boolean) ?? "";

    const videos = data.videos?.results ?? [];
    const trailer =
      videos.find(
        (video) =>
          video.site === "YouTube" && video.type === "Trailer" && video.official,
      ) ??
      videos.find((video) => video.site === "YouTube" && video.type === "Trailer") ??
      videos.find((video) => video.site === "YouTube");

    return {
      tmdbId: data.id,
      name: data.title,
      tagline: data.tagline ?? "",
      synopsis: data.overview ?? "",
      year: Number((data.release_date ?? "").slice(0, 4)) || null,
      rating: optionalRating(certification),
      durationMinutes: data.runtime ?? null,
      seasons: null,
      posterUrl: data.poster_path ? `${IMAGE_BASE}/w500${data.poster_path}` : null,
      backdropUrl: data.backdrop_path ? `${IMAGE_BASE}/w1280${data.backdrop_path}` : null,
      genres: (data.genres ?? []).map((genre) => genre.name),
      cast: (data.credits?.cast ?? []).slice(0, 8).map((member) => member.name),
      creator:
        data.credits?.crew?.find((member) => member.job === "Director")?.name ??
        data.credits?.crew?.[0]?.name ??
        "",
      voteAverage:
        typeof data.vote_average === "number" ? data.vote_average : null,
      trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    };
  }

  const data = await tmdbFetch<TmdbTvDetails>(`/tv/${id}`, {
    append_to_response: "credits,content_ratings",
    language: "en-US",
  });

  return {
    tmdbId: data.id,
    name: data.name,
    tagline: data.tagline ?? "",
    synopsis: data.overview ?? "",
    year: Number((data.first_air_date ?? "").slice(0, 4)) || null,
    rating: optionalRating(
      data.content_ratings?.results?.find((entry) => entry.iso_3166_1 === "US")?.rating,
    ),
    durationMinutes: data.episode_run_time?.[0] ?? null,
    seasons: data.number_of_seasons ?? null,
    posterUrl: data.poster_path ? `${IMAGE_BASE}/w500${data.poster_path}` : null,
    backdropUrl: data.backdrop_path ? `${IMAGE_BASE}/w1280${data.backdrop_path}` : null,
    genres: (data.genres ?? []).map((genre) => genre.name),
    cast: (data.credits?.cast ?? []).slice(0, 8).map((member) => member.name),
    creator: (data.created_by ?? []).map((member) => member.name).join(", "),
    voteAverage: typeof data.vote_average === "number" ? data.vote_average : null,
    trailerUrl: null,
  };
}
