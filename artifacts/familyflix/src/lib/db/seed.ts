import "dotenv/config";

import { sql } from "drizzle-orm";

import { titles } from "@/lib/catalog";
import { db } from "@/lib/db";
import { genres, movieGenres, movies, videoAssets } from "@/lib/db/schema";
import { importedBySlug } from "@/lib/imported";
import { publicDomainBySlug } from "@/lib/public-domain";

function parseDuration(value?: string) {
  if (!value) return null;
  const hours = /(\d+)h/.exec(value)?.[1];
  const minutes = /(\d+)m/.exec(value)?.[1];
  if (!hours && !minutes) return null;
  return Number(hours ?? 0) * 60 + Number(minutes ?? 0);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const genreNames = Array.from(
    new Set(titles.flatMap((title) => title.genres)),
  ).sort();

  const genreIdByName = new Map<string, number>();
  for (const name of genreNames) {
    const [row] = await db
      .insert(genres)
      .values({ name, slug: slugify(name) })
      .onConflictDoUpdate({
        target: genres.slug,
        set: { name },
      })
      .returning({ id: genres.id, name: genres.name });
    genreIdByName.set(row.name, row.id);
  }

  for (const title of titles) {
    const film = publicDomainBySlug.get(title.slug);
    const imported = importedBySlug.get(title.slug);
    const rightsHolder = film
      ? film.license === "creative_commons"
        ? "Nina Paley — CC BY-SA 3.0"
        : "Public domain — Internet Archive"
      : imported?.rightsHolder ?? "Licensed content";
    const licenseType = film?.license ?? imported?.license ?? "licensed";
    const sourceUrl = film?.sourceUrl ?? imported?.sourceUrl ?? "";
    const streamUrl = film?.mp4Url ?? imported?.mp4Url ?? imported?.hlsUrl;
    const isHls = Boolean(streamUrl && streamUrl.includes(".m3u8"));
    const [row] = await db
      .insert(movies)
      .values({
        slug: title.slug,
        name: title.name,
        kind: title.type,
        tagline: title.tagline,
        synopsis: title.synopsis,
        year: title.year,
        rating: title.rating,
        score: title.score,
        durationMinutes: parseDuration(title.duration),
        seasons: title.seasons ?? null,
        badge: title.badge ?? null,
        imageId: title.image,
        palette: title.palette,
        cast: title.cast,
        creator: title.creator,
        episodes: (title.episodes ?? []).map((episode) => ({
          number: episode.number,
          title: episode.title,
          synopsis: episode.synopsis,
          duration: episode.duration,
        })),
        live: title.live ?? null,
        featured: title.featured ?? false,
        status: "published",
        publishedAt: new Date(),
        rightsHolder,
        licenseType,
        licenseTerritory: "Worldwide",
        sourceUrl,
        rightsConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: movies.slug,
        set: {
          name: title.name,
          kind: title.type,
          tagline: title.tagline,
          synopsis: title.synopsis,
          year: title.year,
          rating: title.rating,
          score: title.score,
          durationMinutes: parseDuration(title.duration),
          seasons: title.seasons ?? null,
          badge: title.badge ?? null,
          imageId: title.image,
          palette: title.palette,
          cast: title.cast,
          creator: title.creator,
          episodes: (title.episodes ?? []).map((episode) => ({
            number: episode.number,
            title: episode.title,
            synopsis: episode.synopsis,
            duration: episode.duration,
          })),
          live: title.live ?? null,
          featured: title.featured ?? false,
          rightsHolder,
          licenseType,
          sourceUrl,
          updatedAt: new Date(),
        },
      })
      .returning({ id: movies.id });

    await db.delete(movieGenres).where(sql`${movieGenres.movieId} = ${row.id}`);
    const genreRows = title.genres
      .map((name) => genreIdByName.get(name))
      .filter((id): id is number => typeof id === "number");
    if (genreRows.length) {
      await db
        .insert(movieGenres)
        .values(genreRows.map((genreId) => ({ movieId: row.id, genreId })))
        .onConflictDoNothing();
    }

    if (streamUrl) {
      await db
        .insert(videoAssets)
        .values({
          movieId: row.id,
          provider: "manual",
          status: "ready",
          mp4Url: isHls ? null : streamUrl,
          hlsUrl: isHls ? streamUrl : null,
          signedPlayback: false,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: videoAssets.movieId,
          set: {
            provider: "manual",
            status: "ready",
            mp4Url: isHls ? null : streamUrl,
            hlsUrl: isHls ? streamUrl : null,
            signedPlayback: false,
            error: null,
            updatedAt: new Date(),
          },
        });
    }
  }

  console.log(
    `Seeded ${titles.length} titles, ${genreNames.length} genres, ${publicDomainBySlug.size} public-domain and ${importedBySlug.size} licensed streams.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
