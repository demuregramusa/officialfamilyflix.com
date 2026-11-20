import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { auditLogs, genres, movieGenres, movies, subtitles, videoAssets } from "@/lib/db/schema";
import type { StaffRole } from "@/lib/admin/permissions";
import type { MovieCreateInput, MovieUpdateInput } from "@/lib/admin/validation";

export interface AdminSessionInfo {
  userId: string;
  email: string;
  role: StaffRole;
}

export interface AdminMovieRow {
  id: string;
  slug: string;
  name: string;
  kind: "movie" | "series" | "live";
  status: "draft" | "published" | "archived";
  year: number | null;
  rating: string | null;
  featured: boolean;
  updatedAt: Date;
  posterUrl: string | null;
  imageId: string | null;
  assetStatus: string | null;
  assetProvider: string | null;
  hlsUrl: string | null;
  mp4Url: string | null;
  genres: string[];
}

export async function logAudit(
  session: AdminSessionInfo,
  action: string,
  entity: string,
  entityId: string | null,
  detail?: Record<string, unknown>,
) {
  await db.insert(auditLogs).values({
    userId: session.userId,
    userEmail: session.email,
    action,
    entity,
    entityId,
    detail,
  });
}

export async function listAdminMovies(options: {
  query?: string;
  status?: "draft" | "published" | "archived";
  kind?: "movie" | "series" | "live";
}) {
  const filters = [];
  if (options.status) filters.push(eq(movies.status, options.status));
  if (options.kind) filters.push(eq(movies.kind, options.kind));
  if (options.query) {
    const term = `%${options.query}%`;
    filters.push(or(ilike(movies.name, term), ilike(movies.slug, term)));
  }

  const rows = await db
    .select({
      id: movies.id,
      slug: movies.slug,
      name: movies.name,
      kind: movies.kind,
      status: movies.status,
      year: movies.year,
      rating: movies.rating,
      featured: movies.featured,
      updatedAt: movies.updatedAt,
      posterUrl: movies.posterUrl,
      imageId: movies.imageId,
      assetStatus: videoAssets.status,
      assetProvider: videoAssets.provider,
      hlsUrl: videoAssets.hlsUrl,
      mp4Url: videoAssets.mp4Url,
    })
    .from(movies)
    .leftJoin(videoAssets, eq(videoAssets.movieId, movies.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(movies.updatedAt))
    .limit(200);

  if (!rows.length) return [];

  const genreRows = await db
    .select({ movieId: movieGenres.movieId, name: genres.name })
    .from(movieGenres)
    .innerJoin(genres, eq(genres.id, movieGenres.genreId))
    .where(
      inArray(
        movieGenres.movieId,
        rows.map((row) => row.id),
      ),
    );

  const genreMap = new Map<string, string[]>();
  for (const row of genreRows) {
    genreMap.set(row.movieId, [...(genreMap.get(row.movieId) ?? []), row.name]);
  }

  return rows.map((row) => ({ ...row, genres: genreMap.get(row.id) ?? [] })) satisfies AdminMovieRow[];
}

export async function getAdminMovie(id: string) {
  const [movie] = await db.select().from(movies).where(eq(movies.id, id)).limit(1);
  if (!movie) return null;

  const [genreRows, subtitleRows, assetRows] = await Promise.all([
    db
      .select({ name: genres.name })
      .from(movieGenres)
      .innerJoin(genres, eq(genres.id, movieGenres.genreId))
      .where(eq(movieGenres.movieId, id)),
    db.select().from(subtitles).where(eq(subtitles.movieId, id)).orderBy(subtitles.createdAt),
    db.select().from(videoAssets).where(eq(videoAssets.movieId, id)).limit(1),
  ]);

  return {
    movie,
    genres: genreRows.map((row) => row.name),
    subtitles: subtitleRows,
    asset: assetRows[0] ?? null,
  };
}

async function genreIdsForNames(names: string[]) {
  const unique = Array.from(
    new Map(
      names
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => [name.toLowerCase(), name]),
    ).entries(),
  ).slice(0, 12);

  const ids: number[] = [];
  for (const [slugBase, name] of unique) {
    const slug = slugBase.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const [row] = await db
      .insert(genres)
      .values({ name, slug })
      .onConflictDoUpdate({ target: genres.slug, set: { name } })
      .returning({ id: genres.id });
    ids.push(row.id);
  }
  return ids;
}

async function setGenres(movieId: string, names: string[]) {
  await db.delete(movieGenres).where(eq(movieGenres.movieId, movieId));
  const ids = await genreIdsForNames(names);
  if (ids.length) {
    await db
      .insert(movieGenres)
      .values(ids.map((genreId) => ({ movieId, genreId })))
      .onConflictDoNothing();
  }
}

function toMovieValues<T extends MovieCreateInput | MovieUpdateInput>(input: T) {
  const { genres: _genres, rightsConfirmed, ...values } = input;
  return {
    ...values,
    rightsConfirmedAt:
      rightsConfirmed === undefined ? undefined : rightsConfirmed ? new Date() : null,
  };
}

export async function createMovie(input: MovieCreateInput, session: AdminSessionInfo) {
  const { genres: genreNames } = input;
  const values = toMovieValues(input);

  const [row] = await db
    .insert(movies)
    .values({
      ...values,
      createdBy: session.userId,
      publishedAt: input.status === "published" ? new Date() : null,
      updatedAt: new Date(),
    })
    .returning();

  await setGenres(row.id, genreNames);
  await logAudit(session, "movie.create", "movie", row.id, { name: row.name });
  return row;
}

export async function updateMovie(
  id: string,
  input: MovieUpdateInput,
  session: AdminSessionInfo,
) {
  const [existing] = await db.select().from(movies).where(eq(movies.id, id)).limit(1);
  if (!existing) return null;

  const { genres: genreNames } = input;
  const values = toMovieValues(input);

  const [row] = await db
    .update(movies)
    .set({
      ...values,
      publishedAt:
        input.status === "published" && !existing.publishedAt ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(movies.id, id))
    .returning();

  if (genreNames) await setGenres(id, genreNames);
  await logAudit(session, "movie.update", "movie", id, { name: row.name });
  return row;
}

export async function deleteMovie(id: string, session: AdminSessionInfo) {
  const [existing] = await db.select().from(movies).where(eq(movies.id, id)).limit(1);
  if (!existing) return null;

  await db.delete(movies).where(eq(movies.id, id));
  await logAudit(session, "movie.delete", "movie", id, { name: existing.name });
  return existing;
}

export async function countMovies() {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      published: sql<number>`count(*) filter (where ${movies.status} = 'published')::int`,
      drafts: sql<number>`count(*) filter (where ${movies.status} = 'draft')::int`,
    })
    .from(movies);

  const [assets] = await db
    .select({
      processing: sql<number>`count(*) filter (where ${videoAssets.status} in ('processing','pending_upload'))::int`,
      ready: sql<number>`count(*) filter (where ${videoAssets.status} = 'ready')::int`,
      missing: sql<number>`count(*) filter (where ${videoAssets.status} is null)::int`,
    })
    .from(videoAssets);

  const [pendingRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(movies)
    .leftJoin(videoAssets, eq(videoAssets.movieId, movies.id))
    .where(
      and(
        eq(movies.status, "published"),
        or(
          sql`${videoAssets.status} is null`,
          inArray(videoAssets.status, ["pending_upload", "processing", "error"]),
        ),
      ),
    );

  return {
    total: row.total,
    published: row.published,
    drafts: row.drafts,
    assetsProcessing: assets.processing,
    assetsReady: assets.ready,
    assetsMissing: assets.missing,
    publishedWithoutStream: pendingRow.total,
  };
}

export async function recentMovies(limit = 6) {
  return db
    .select({
      id: movies.id,
      name: movies.name,
      kind: movies.kind,
      status: movies.status,
      updatedAt: movies.updatedAt,
    })
    .from(movies)
    .orderBy(desc(movies.updatedAt))
    .limit(limit);
}

export async function recentAudit(limit = 8) {
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export function publishBlockers(
  movie: {
    kind: "movie" | "series" | "live";
    rightsHolder: string | null;
    licenseType: "owned" | "public_domain" | "creative_commons" | "licensed" | "unlicensed";
    licenseExpiresAt: Date | null;
    rightsConfirmedAt: Date | null;
  },
  asset: { status: string; hlsUrl: string | null; mp4Url: string | null } | null,
) {
  const blockers: string[] = [];
  if (!movie.rightsHolder?.trim()) blockers.push("Add the rights holder.");
  if (movie.licenseType === "unlicensed") blockers.push("Choose a license type.");
  if (!movie.rightsConfirmedAt) blockers.push("Confirm you hold distribution rights.");
  if (movie.licenseExpiresAt && movie.licenseExpiresAt.getTime() < Date.now()) {
    blockers.push("The license has expired.");
  }
  if (movie.kind !== "live") {
    if (!asset) blockers.push("Attach a video stream.");
    else if (asset.status !== "ready") blockers.push("Wait for the stream to finish processing.");
    else if (!asset.hlsUrl && !asset.mp4Url) blockers.push("Attach an HLS or MP4 URL.");
  }
  return blockers;
}
