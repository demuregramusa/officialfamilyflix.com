import { and, asc, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import {
  GetAdminTitleParams,
  ImportAdminSeriesEpisodesBody,
  ImportAdminSeriesEpisodesParams,
  ImportAdminSeriesEpisodesResponse,
  ListAdminSeriesEpisodesParams,
  ListAdminSeriesEpisodesResponse,
  PublishSeriesEpisodeParams,
  PublishSeriesEpisodeResponse,
  ReviewSeriesEpisodeBody,
  ReviewSeriesEpisodeParams,
  ReviewSeriesEpisodeResponse,
} from "@workspace/api-zod";
import {
  db,
  mediaRights,
  movies,
  seriesEpisodes,
  seriesSeasons,
  videoAssets,
  type MediaRight,
} from "@workspace/db";
import { requireCapability } from "../lib/auth-middleware";
import { logAudit } from "../lib/audit";
import { hasEpisodePlaybackAssets } from "../lib/episode-eligibility";
import { isEvidenceComplete, isRightCurrent, rightsFromDb, rightsToInsert, validatePublicHttpUrl, validateRightsInput } from "../lib/rights";

const router = Router();

function streamStatus(status: string | null | undefined) {
  if (!status) return "missing";
  return status === "pending_upload" ? "pending" : status;
}

function toAdminEpisode(
  episode: typeof seriesEpisodes.$inferSelect,
  seasonNumber: number,
  seasonName: string | null,
  rights: MediaRight[],
  video: typeof videoAssets.$inferSelect | undefined,
) {
  return {
    id: episode.id,
    seasonNumber,
    seasonName,
    episodeNumber: episode.episodeNumber,
    name: episode.name,
    synopsis: episode.synopsis,
    durationMinutes: episode.durationMinutes,
    status: episode.status,
    rights: rights.map(rightsFromDb),
    streamStatus: streamStatus(video?.status),
  };
}

async function getAdminEpisode(episodeId: string) {
  const [row] = await db.select({
    episode: seriesEpisodes,
    seasonNumber: seriesSeasons.seasonNumber,
    seasonName: seriesSeasons.name,
  }).from(seriesEpisodes)
    .innerJoin(seriesSeasons, eq(seriesEpisodes.seasonId, seriesSeasons.id))
    .where(eq(seriesEpisodes.id, episodeId))
    .limit(1);
  if (!row) return null;
  const [rights, video] = await Promise.all([
    db.select().from(mediaRights).where(eq(mediaRights.episodeId, episodeId)),
    db.select().from(videoAssets).where(eq(videoAssets.episodeId, episodeId)).limit(1),
  ]);
  return toAdminEpisode(row.episode, row.seasonNumber, row.seasonName, rights, video[0]);
}

router.get("/admin/titles/:id/episodes", requireCapability("library.view"), async (request, response) => {
  const parsed = ListAdminSeriesEpisodesParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid series ID." });
    return;
  }
  const [series] = await db.select().from(movies).where(eq(movies.id, parsed.data.id)).limit(1);
  if (!series) {
    response.status(404).json({ error: "Series not found." });
    return;
  }
  if (series.kind !== "series") {
    response.status(409).json({ error: "Episodes can only be managed for a series." });
    return;
  }
  const rows = await db.select({
    episode: seriesEpisodes,
    seasonId: seriesSeasons.id,
    seasonNumber: seriesSeasons.seasonNumber,
    seasonName: seriesSeasons.name,
  }).from(seriesEpisodes)
    .innerJoin(seriesSeasons, eq(seriesEpisodes.seasonId, seriesSeasons.id))
    .where(eq(seriesSeasons.movieId, series.id))
    .orderBy(asc(seriesSeasons.seasonNumber), asc(seriesEpisodes.episodeNumber));
  if (!rows.length) {
    response.json(ListAdminSeriesEpisodesResponse.parse([]));
    return;
  }
  const episodeIds = rows.map(({ episode }) => episode.id);
  const [rights, videos] = await Promise.all([
    db.select().from(mediaRights).where(inArray(mediaRights.episodeId, episodeIds)),
    db.select().from(videoAssets).where(inArray(videoAssets.episodeId, episodeIds)),
  ]);
  const rightsByEpisode = new Map<string, MediaRight[]>();
  for (const right of rights) {
    if (!right.episodeId) continue;
    rightsByEpisode.set(right.episodeId, [...(rightsByEpisode.get(right.episodeId) ?? []), right]);
  }
  const videoByEpisode = new Map(
    videos.filter((video) => video.episodeId).map((video) => [video.episodeId!, video]),
  );
  const result = rows.map(({ episode, seasonNumber, seasonName }) =>
    toAdminEpisode(
      episode,
      seasonNumber,
      seasonName,
      rightsByEpisode.get(episode.id) ?? [],
      videoByEpisode.get(episode.id),
    ),
  );
  response.json(ListAdminSeriesEpisodesResponse.parse(result));
});

router.post("/admin/titles/:id/episodes", requireCapability("rights.manage"), async (request, response) => {
  const params = ImportAdminSeriesEpisodesParams.safeParse(request.params);
  const parsed = ImportAdminSeriesEpisodesBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: (!parsed.success && parsed.error.issues[0]?.message) ?? "Invalid season and episode data." });
    return;
  }
  const [series] = await db.select().from(movies).where(eq(movies.id, params.data.id)).limit(1);
  if (!series) {
    response.status(404).json({ error: "Series not found." });
    return;
  }
  if (series.kind !== "series") {
    response.status(409).json({ error: "Episodes can only be added to a series." });
    return;
  }
  const input = parsed.data;
  const seasonNumbers = input.seasons.map((season) => season.seasonNumber);
  if (new Set(seasonNumbers).size !== seasonNumbers.length) {
    response.status(400).json({ error: "Each season number may appear only once per import." });
    return;
  }
  for (const season of input.seasons) {
    const numbers = season.episodes.map((episode) => episode.episodeNumber);
    if (new Set(numbers).size !== numbers.length) {
      response.status(400).json({ error: `Season ${season.seasonNumber} repeats an episode number.` });
      return;
    }
    for (const episode of season.episodes) {
      if (episode.rights.assetKind !== "main-video") {
        response.status(400).json({ error: `Season ${season.seasonNumber}, episode ${episode.episodeNumber} needs main-video rights evidence.` });
        return;
      }
      const rightsIssue = validateRightsInput(episode.rights);
      if (rightsIssue) {
        response.status(400).json({ error: `Season ${season.seasonNumber}, episode ${episode.episodeNumber}: ${rightsIssue}` });
        return;
      }
      const urlIssue = validatePublicHttpUrl(episode.stream.url);
      let source: URL;
      let asset: URL;
      try {
        source = new URL(episode.stream.url);
        asset = new URL(episode.rights.assetUrl);
      } catch {
        response.status(400).json({ error: "Episode source and rights asset must be valid URLs." });
        return;
      }
      if (urlIssue || source.protocol !== "https:" ||
        !/\.(?:mp4|m3u8)$/i.test(source.pathname) ||
        asset.href !== source.href) {
        response.status(400).json({
          error: `Season ${season.seasonNumber}, episode ${episode.episodeNumber} needs one direct HTTPS .mp4 or .m3u8 source that exactly matches its rights asset URL.`,
        });
        return;
      }
    }
  }

  const session = response.locals.session;
  try {
    const episodeIds = await db.transaction(async (tx) => {
      const created: string[] = [];
      for (const seasonInput of input.seasons) {
        const [createdSeason] = await tx.insert(seriesSeasons).values({
          movieId: series.id,
          seasonNumber: seasonInput.seasonNumber,
          name: seasonInput.name?.trim() || null,
        }).onConflictDoNothing().returning({ id: seriesSeasons.id });
        const [season] = createdSeason
          ? [createdSeason]
          : await tx.select({ id: seriesSeasons.id }).from(seriesSeasons).where(and(
            eq(seriesSeasons.movieId, series.id),
            eq(seriesSeasons.seasonNumber, seasonInput.seasonNumber),
          )).limit(1);
        if (!season) throw new Error("Could not create or locate the requested season.");
        for (const episodeInput of seasonInput.episodes) {
          const [episode] = await tx.insert(seriesEpisodes).values({
            seasonId: season.id,
            episodeNumber: episodeInput.episodeNumber,
            name: episodeInput.name.trim(),
            synopsis: episodeInput.synopsis,
            durationMinutes: episodeInput.durationMinutes ?? null,
            createdBy: session.user.id,
          }).returning({ id: seriesEpisodes.id });
          const [right] = await tx.insert(mediaRights).values(
            rightsToInsert(episodeInput.rights, null, session, episode.id),
          ).returning({ id: mediaRights.id });
          const url = episodeInput.stream.url;
          const isHls = /\.m3u8$/i.test(new URL(url).pathname);
          await tx.insert(videoAssets).values({
            movieId: null,
            episodeId: episode.id,
            mediaRightId: right.id,
            provider: "manual",
            providerAssetId: null,
            playbackId: null,
            hlsUrl: isHls ? url : null,
            mp4Url: isHls ? null : url,
            status: "ready",
            signedPlayback: false,
            createdBy: session.user.id,
            updatedAt: new Date(),
          });
          created.push(episode.id);
        }
      }
      return created;
    });
    await logAudit(session, "series.episodes.import", "series", series.id, {
      episodeCount: episodeIds.length,
      seasonNumbers,
    });
    const result = await Promise.all(episodeIds.map(getAdminEpisode));
    response.status(201).json(ImportAdminSeriesEpisodesResponse.parse(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Episode import failed.";
    response.status(409).json({ error: /unique|duplicate/i.test(message)
      ? "One or more season or episode numbers already exist for this series."
      : "Episode import could not be completed." });
  }
});

router.post("/admin/episodes/:episodeId/review", requireCapability("rights.manage"), async (request, response) => {
  const params = ReviewSeriesEpisodeParams.safeParse(request.params);
  const parsed = ReviewSeriesEpisodeBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: (!parsed.success && parsed.error.issues[0]?.message) ?? "Select a review decision and note." });
    return;
  }
  const episodeId = params.data.episodeId;
  const [episode] = await db.select().from(seriesEpisodes).where(eq(seriesEpisodes.id, episodeId)).limit(1);
  if (!episode) {
    response.status(404).json({ error: "Episode not found." });
    return;
  }
  const rights = await db.select().from(mediaRights).where(eq(mediaRights.episodeId, episodeId));
  if (!rights.length) {
    response.status(409).json({ error: "Episode rights evidence is missing." });
    return;
  }
  if (["approve", "restore"].includes(parsed.data.decision) &&
    rights.some((right) => !isEvidenceComplete(right) || !isRightCurrent({ ...right, reviewStatus: "approved" }))) {
    response.status(409).json({ error: "Episode rights evidence is incomplete or expired." });
    return;
  }
  const nextStatus = ["approve", "restore"].includes(parsed.data.decision)
    ? "approved"
    : parsed.data.decision === "reject" ? "rejected" : "restricted";
  await db.transaction(async (tx) => {
    await tx.update(mediaRights).set({
      reviewStatus: nextStatus,
      reviewedBy: response.locals.session.user.id,
      reviewedAt: new Date(),
      reviewNotes: parsed.data.note,
      updatedAt: new Date(),
    }).where(eq(mediaRights.episodeId, episodeId));
    if (["reject", "restrict"].includes(parsed.data.decision)) {
      await tx.update(seriesEpisodes).set({
        status: "archived",
        publishedAt: null,
        updatedAt: new Date(),
      }).where(eq(seriesEpisodes.id, episodeId));
    }
  });
  await logAudit(response.locals.session, `episode.rights.${parsed.data.decision}`, "episode", episodeId, {
    rightsIds: rights.map((right) => right.id),
    note: parsed.data.note,
  });
  const result = await getAdminEpisode(episodeId);
  response.json(ReviewSeriesEpisodeResponse.parse(result));
});

router.post("/admin/episodes/:episodeId/publish", requireCapability("library.publish"), async (request, response) => {
  const params = PublishSeriesEpisodeParams.safeParse(request.params);
  if (!params.success) {
    response.status(400).json({ error: "Invalid episode ID." });
    return;
  }
  const episodeId = params.data.episodeId;
  const [row] = await db.select({
    episode: seriesEpisodes,
    season: seriesSeasons,
    series: movies,
  }).from(seriesEpisodes)
    .innerJoin(seriesSeasons, eq(seriesEpisodes.seasonId, seriesSeasons.id))
    .innerJoin(movies, eq(seriesSeasons.movieId, movies.id))
    .where(eq(seriesEpisodes.id, episodeId))
    .limit(1);
  if (!row) {
    response.status(404).json({ error: "Episode not found." });
    return;
  }
  const [rights, video] = await Promise.all([
    db.select().from(mediaRights).where(eq(mediaRights.episodeId, episodeId)),
    db.select().from(videoAssets).where(eq(videoAssets.episodeId, episodeId)).limit(1),
  ]);
  if (row.series.kind !== "series" || row.series.status !== "published" ||
    rights.length !== 1 ||
    rights.some((right) => !isEvidenceComplete(right) || !isRightCurrent(right)) ||
    !hasEpisodePlaybackAssets(rights, video[0])) {
    response.status(409).json({ error: "Publish the series first, then ensure the episode has current approved rights and a matching ready stream." });
    return;
  }
  await db.update(seriesEpisodes).set({
    status: "published",
    publishedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(seriesEpisodes.id, episodeId));
  await logAudit(response.locals.session, "episode.publish", "episode", episodeId, {
    seriesId: row.series.id,
    seasonNumber: row.season.seasonNumber,
    episodeNumber: row.episode.episodeNumber,
  });
  const result = await getAdminEpisode(episodeId);
  response.json(PublishSeriesEpisodeResponse.parse(result));
});

export default router;
