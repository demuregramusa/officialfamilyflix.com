import { and, eq, ilike, inArray, desc } from "drizzle-orm";
import {
  db,
  mediaRights,
  movies,
  videoAssets,
  type MediaRight,
  type Movie,
} from "@workspace/db";
import { rightsFromDb } from "./rights";

function streamStatus(status: string | null | undefined) {
  if (!status) return "missing";
  if (status === "pending_upload") return "pending";
  return status;
}

function streamObject(video: (typeof videoAssets.$inferSelect) | undefined) {
  if (!video || video.provider === "demo") return null;
  return {
    provider: video.provider,
    mp4Url: video.mp4Url,
    hlsUrl: video.hlsUrl,
    playbackId: video.playbackId,
    signedPlayback: video.signedPlayback,
  };
}

export function toAdminTitle(
  movie: Movie,
  rights: MediaRight[],
  video: (typeof videoAssets.$inferSelect) | undefined,
) {
  return {
    id: movie.id,
    slug: movie.slug,
    name: movie.name,
    kind: movie.kind,
    synopsis: movie.synopsis,
    status: movie.status,
    rights: rights.map(rightsFromDb),
    streamStatus: streamStatus(video?.status),
    stream: streamObject(video),
    createdAt: movie.createdAt.toISOString(),
  };
}

export async function getAdminTitle(id: string) {
  const [movie] = await db.select().from(movies).where(eq(movies.id, id)).limit(1);
  if (!movie) return null;
  const [rights, video] = await Promise.all([
    db.select().from(mediaRights).where(eq(mediaRights.movieId, id)),
    db.select().from(videoAssets).where(eq(videoAssets.movieId, id)).limit(1),
  ]);
  return toAdminTitle(movie, rights, video[0]);
}

export async function listAdminTitles(options: {
  query?: string;
  reviewStatus?: string;
} = {}) {
  const conditions = [];
  if (options.query?.trim()) conditions.push(ilike(movies.name, `%${options.query.trim()}%`));
  const rows = await db
    .select()
    .from(movies)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(movies.updatedAt), desc(movies.createdAt))
    .limit(200);
  if (!rows.length) return [];

  const ids = rows.map((movie) => movie.id);
  const [allRights, allVideos] = await Promise.all([
    db.select().from(mediaRights).where(inArray(mediaRights.movieId, ids)),
    db.select().from(videoAssets).where(inArray(videoAssets.movieId, ids)),
  ]);
  const rightsByMovie = new Map<string, MediaRight[]>();
  for (const rights of allRights) {
    if (!rights.movieId) continue;
    rightsByMovie.set(rights.movieId, [...(rightsByMovie.get(rights.movieId) ?? []), rights]);
  }
  const videoByMovie = new Map(allVideos.map((video) => [video.movieId, video]));

  return rows
    .filter((movie) => {
      if (!options.reviewStatus) return true;
      return (rightsByMovie.get(movie.id) ?? []).some((right) =>
        right.reviewStatus.replaceAll("_", "-") === options.reviewStatus,
      );
    })
    .map((movie) => toAdminTitle(
      movie,
      rightsByMovie.get(movie.id) ?? [],
      videoByMovie.get(movie.id),
    ));
}
