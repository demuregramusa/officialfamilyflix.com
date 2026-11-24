import { Router } from "express";
import {
  GetPublicTitleParams,
  GetPlaybackParams,
  GetEpisodePlaybackParams,
  GetEpisodePlaybackProgressParams,
  ListPublicTitlesQueryParams,
  GetPlaybackProgressParams,
  SaveEpisodePlaybackProgressBody,
  SaveEpisodePlaybackProgressParams,
  SavePlaybackProgressBody,
  SavePlaybackProgressParams,
} from "@workspace/api-zod";
import { db, playbackProgress, siteSettings } from "@workspace/db";
import { getCatalogRows, getEpisodePlaybackForRow, getPlaybackForRow, getPublicCatalogRowBySlug, toPublicTitle, toPublicTitleDetail } from "../lib/catalog";
import { catalogService } from "../lib/catalog-service";
import { validatePublicHttpUrl } from "../lib/rights";
import { and, eq, isNull, sql } from "drizzle-orm";
import { importedTorrentSources } from "@workspace/db";
import {
  openApprovedTorrentMedia,
  parseSingleByteRange,
  setTorrentClientErrorHandler,
  stopTorrentSourceStreams,
} from "../lib/torrent-playback";
import { logger } from "../lib/logger";
import { isTorrentPlaybackEligible } from "../lib/torrent-source-policy.mjs";
import { requireSession } from "../lib/auth-middleware";
import { generateHumanSpeech } from "../lib/tts-service";

setTorrentClientErrorHandler((error) => {
  logger.error({ err: error }, "Torrent client reported an error");
});

const router = Router();

async function serveTorrentMedia(
  request: import("express").Request,
  response: import("express").Response,
  slug: string,
  headOnly = false,
  episodeId?: string,
): Promise<void> {
  const row = await getPublicCatalogRowBySlug(slug);
  const expectedUrl = episodeId
    ? `/api/playback/${encodeURIComponent(slug)}/episodes/${encodeURIComponent(episodeId)}/media`
    : `/api/playback/${encodeURIComponent(slug)}/media`;
  if (!row || !row.torrent) {
    response.status(404).json({ error: "This torrent-backed title is not available." });
    return;
  }
  const playback = episodeId
    ? await getEpisodePlaybackForRow(row, episodeId)
    : await getPlaybackForRow(row);
  if (!playback || playback.url !== expectedUrl) {
    response.status(403).json({ error: "This torrent source is not currently approved for playback." });
    return;
  }

  const [source] = await db.select().from(importedTorrentSources)
    .where(eq(importedTorrentSources.id, row.torrent.id))
    .limit(1);
  if (
    !source ||
    source.playbackStatus !== "active" ||
    source.rightsStatus !== "approved"
  ) {
    response.status(403).json({ error: "This torrent source is not currently active." });
    return;
  }

  let media;
  try {
    media = await openApprovedTorrentMedia(source);
  } catch (error) {
    request.log?.warn({ titleId: row.movie.id, torrentId: source.id, err: error }, "Approved torrent media is connecting or momentarily unavailable");
    response.status(503).json({ error: "This stream is currently initializing. Please retry in a moment." });
    return;
  }

  const [currentSource] = await db.select().from(importedTorrentSources)
    .where(eq(importedTorrentSources.id, source.id))
    .limit(1);
  if (!currentSource || !isTorrentPlaybackEligible(currentSource, true)) {
    await stopTorrentSourceStreams(source.id);
    response.status(403).json({ error: "This torrent source is no longer active and approved." });
    return;
  }

  const range = parseSingleByteRange(request.header("range"), media.length);
  if (!range) {
    response.setHeader("Content-Range", `bytes */${media.length}`);
    response.status(416).end();
    return;
  }
  const contentLength = range.end - range.start + 1;
  response.status(range.partial ? 206 : 200);
  response.setHeader("Accept-Ranges", "bytes");
  response.setHeader("Content-Type", media.contentType);
  response.setHeader("Content-Length", String(contentLength));
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Disposition", `inline; filename="familyflix-${row.movie.slug}.mp4"`);
  if (range.partial) {
    response.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${media.length}`);
  }
  if (headOnly || request.method === "HEAD") {
    response.end();
    return;
  }

  let stream;
  try {
    stream = media.createReadStream({ start: range.start, end: range.end });
  } catch {
    response.status(403).json({ error: "This torrent source is no longer active." });
    return;
  }
  stream.once("error", (error) => {
    request.log?.warn({ titleId: row.movie.id, torrentId: source.id, err: error }, "Torrent stream ended with an error");
    if (!response.headersSent) response.status(503);
    response.destroy(error);
  });
  request.once("aborted", () => stream.destroy());
  response.once("close", () => {
    if (!response.writableEnded) stream.destroy();
  });
  stream.pipe(response);
}

const imageProxyCache = new Map<string, { buf: Buffer; contentType: string }>();

router.get("/v1/image-proxy", async (req, res) => {
  const imageUrl = req.query.url as string | undefined;
  if (!imageUrl) {
    res.status(400).send("Image URL required");
    return;
  }
  const target = imageUrl.replace("https://yts.pw/", "https://img.yts.pw/");
  const cachedImg = imageProxyCache.get(target);
  if (cachedImg) {
    res.setHeader("Content-Type", cachedImg.contentType);
    res.setHeader("Cache-Control", "public, max-age=604800, s-maxage=2592000, immutable");
    res.send(cachedImg.buf);
    return;
  }
  try {
    const upstream = await fetch(target, {
      signal: AbortSignal.timeout(4000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://img.yts.pw/",
      },
    });
    if (!upstream.ok) {
      res.status(upstream.status).send("Failed to fetch image");
      return;
    }
    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=604800, s-maxage=2592000, immutable");
    const buffer = Buffer.from(await upstream.arrayBuffer());
    if (imageProxyCache.size > 400) {
      const oldestKey = imageProxyCache.keys().next().value;
      if (oldestKey) imageProxyCache.delete(oldestKey);
    }
    imageProxyCache.set(target, { buf: buffer, contentType });
    res.send(buffer);
  } catch {
    res.status(502).send("Proxy error");
  }
});

router.get("/v1/titles", async (request, response) => {
  const parsed = ListPublicTitlesQueryParams.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid catalog filters." });
    return;
  }
  const offset = request.query.offset ? Number(request.query.offset) : 0;
  const genre = request.query.genre as string | undefined;

  await catalogService.ensureLoaded();
  const { titles, total } = catalogService.getPublicTitles({
    query: parsed.data.query,
    kind: parsed.data.kind,
    genre,
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
    limit: parsed.data.limit,
  });

  response.setHeader("X-Catalog-Total", String(total));
  response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  response.json(titles);
});

router.get("/v1/titles/:slug", async (request, response) => {
  const parsed = GetPublicTitleParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid title slug." });
    return;
  }
  const row = await getPublicCatalogRowBySlug(parsed.data.slug);
  if (!row) {
    response.status(404).json({ error: "This title is not available in the approved catalog." });
    return;
  }
  if (row.torrent) {
    openApprovedTorrentMedia(row.torrent).catch(() => {});
  }
  response.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  response.json(toPublicTitleDetail(row));
});

router.get("/playback/:slug", async (request, response) => {
  const parsed = GetPlaybackParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid title slug." });
    return;
  }
  const row = await getPublicCatalogRowBySlug(parsed.data.slug);
  if (!row) {
    response.status(404).json({ error: "This title is not available in the approved catalog." });
    return;
  }
  const playback = await getPlaybackForRow(row);
  if (!playback) {
    response.status(403).json({ error: "Rights or playback requirements are not currently satisfied." });
    return;
  }
  const torrentStreamPath = `/api/playback/${encodeURIComponent(parsed.data.slug)}/media`;
  if (row.torrent && playback.url === torrentStreamPath) {
    openApprovedTorrentMedia(row.torrent).catch(() => {});
    response.json(playback);
    return;
  }
  const urlIssue = validatePublicHttpUrl(playback.url);
  if (urlIssue || /magnet|torrent/i.test(playback.url)) {
    request.log?.error({ titleId: row.movie.id }, "Playback source failed the media URL policy");
    response.status(403).json({ error: "This media source is not accepted for playback." });
    return;
  }
  response.json(playback);
});

router.get("/playback/:slug/media", async (request, response): Promise<void> => {
  const parsed = GetPlaybackParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid title slug." });
    return;
  }
  await serveTorrentMedia(request, response, parsed.data.slug);
});

router.head("/playback/:slug/media", async (request, response): Promise<void> => {
  const parsed = GetPlaybackParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).end();
    return;
  }
  await serveTorrentMedia(request, response, parsed.data.slug, true);
});

router.get("/playback/:slug/episodes/:episodeId/media", async (request, response): Promise<void> => {
  const parsed = GetEpisodePlaybackParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid series or episode ID." });
    return;
  }
  await serveTorrentMedia(request, response, parsed.data.slug, false, parsed.data.episodeId);
});

router.head("/playback/:slug/episodes/:episodeId/media", async (request, response): Promise<void> => {
  const parsed = GetEpisodePlaybackParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).end();
    return;
  }
  await serveTorrentMedia(request, response, parsed.data.slug, true, parsed.data.episodeId);
});

router.get("/playback/:slug/episodes/:episodeId", async (request, response) => {
  const parsed = GetEpisodePlaybackParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid series or episode ID." });
    return;
  }
  const row = await getPublicCatalogRowBySlug(parsed.data.slug);
  const episodeIsVisible = row?.movie.kind === "series" &&
    row.episodes.some(({ episode }) => episode.id === parsed.data.episodeId);
  if (!row || !episodeIsVisible) {
    response.status(404).json({ error: "This episode is not available in the approved catalog." });
    return;
  }
  const playback = await getEpisodePlaybackForRow(row, parsed.data.episodeId);
  if (!playback) {
    response.status(403).json({ error: "Episode rights or playback requirements are not currently satisfied." });
    return;
  }
  const torrentStreamPath = `/api/playback/${encodeURIComponent(parsed.data.slug)}/episodes/${encodeURIComponent(parsed.data.episodeId)}/media`;
  if (playback.url === torrentStreamPath) {
    if (row.torrent) {
      openApprovedTorrentMedia(row.torrent).catch(() => {});
    }
    response.json(playback);
    return;
  }
  const urlIssue = validatePublicHttpUrl(playback.url);
  if (urlIssue || /magnet|torrent/i.test(playback.url)) {
    request.log?.error({ episodeId: parsed.data.episodeId }, "Episode playback source failed the media URL policy");
    response.status(403).json({ error: "This media source is not accepted for playback." });
    return;
  }
  response.json(playback);
});

async function getPlayableProgressTarget(slug: string, episodeId?: string | null) {
  const row = await getPublicCatalogRowBySlug(slug);
  if (!row) return null;
  if (episodeId) {
    const playback = await getEpisodePlaybackForRow(row, episodeId);
    return playback ? { row, episodeId } : null;
  }
  return await getPlaybackForRow(row) ? { row, episodeId: null } : null;
}

function progressResponse(record?: typeof playbackProgress.$inferSelect) {
  return {
    progressSeconds: record?.progressSeconds ?? 0,
    durationSeconds: record?.durationSeconds ?? 0,
    updatedAt: record?.updatedAt?.toISOString() ?? null,
  };
}

async function readPlaybackProgress(
  slug: string,
  episodeId: string | null,
  userId: string,
  response: import("express").Response,
): Promise<void> {
  const target = await getPlayableProgressTarget(slug, episodeId);
  if (!target) {
    response.status(404).json({ error: "This title or episode is not currently playable." });
    return;
  }
  const filters = [
    eq(playbackProgress.userId, userId),
    eq(playbackProgress.movieId, target.row.movie.id),
    target.episodeId
      ? eq(playbackProgress.episodeId, target.episodeId)
      : isNull(playbackProgress.episodeId),
  ];
  const [record] = await db.select().from(playbackProgress).where(and(...filters)).limit(1);
  response.json(progressResponse(record));
}

async function savePlaybackProgress(
  slug: string,
  episodeId: string | null,
  userId: string,
  progressSeconds: number,
  durationSeconds: number,
  response: import("express").Response,
): Promise<void> {
  if (
    progressSeconds > durationSeconds ||
    durationSeconds <= 0 ||
    progressSeconds > 86400 ||
    durationSeconds > 86400
  ) {
    response.status(400).json({ error: "Playback progress must be within the video duration." });
    return;
  }
  const target = await getPlayableProgressTarget(slug, episodeId);
  if (!target) {
    response.status(404).json({ error: "This title or episode is not currently playable." });
    return;
  }
  const values = {
    userId,
    movieId: target.row.movie.id,
    episodeId: target.episodeId,
    progressSeconds,
    durationSeconds,
    updatedAt: new Date(),
  };
  try {
    const filters = [
      eq(playbackProgress.userId, userId),
      eq(playbackProgress.movieId, target.row.movie.id),
      target.episodeId
        ? eq(playbackProgress.episodeId, target.episodeId)
        : isNull(playbackProgress.episodeId),
    ];
    const [existing] = await db
      .select({ userId: playbackProgress.userId })
      .from(playbackProgress)
      .where(and(...filters))
      .limit(1);
    if (existing) {
      await db
        .update(playbackProgress)
        .set({ progressSeconds, durationSeconds, updatedAt: values.updatedAt })
        .where(and(...filters));
    } else {
      await db.insert(playbackProgress).values(values);
    }
  } catch (err) {
    logger.warn({ err, slug, episodeId }, "Non-fatal playback progress persistence warning");
  }
  response.json(progressResponse(values));
}

router.get("/playback/:slug/progress", requireSession, async (request, response): Promise<void> => {
  const params = GetPlaybackProgressParams.safeParse(request.params);
  if (!params.success) {
    response.status(400).json({ error: "Invalid playback progress request." });
    return;
  }
  await readPlaybackProgress(
    params.data.slug,
    null,
    response.locals.session.user.id,
    response,
  );
});

router.get("/playback/:slug/episodes/:episodeId/progress", requireSession, async (request, response): Promise<void> => {
  const params = GetEpisodePlaybackProgressParams.safeParse(request.params);
  if (!params.success) {
    response.status(400).json({ error: "Invalid episode progress request." });
    return;
  }
  await readPlaybackProgress(
    params.data.slug,
    params.data.episodeId,
    response.locals.session.user.id,
    response,
  );
});

router.put("/playback/:slug/progress", requireSession, async (request, response): Promise<void> => {
  const params = SavePlaybackProgressParams.safeParse(request.params);
  const parsed = SavePlaybackProgressBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: "Invalid playback progress." });
    return;
  }
  await savePlaybackProgress(
    params.data.slug,
    null,
    response.locals.session.user.id,
    parsed.data.progressSeconds,
    parsed.data.durationSeconds,
    response,
  );
});

router.put("/playback/:slug/episodes/:episodeId/progress", requireSession, async (request, response): Promise<void> => {
  const params = SaveEpisodePlaybackProgressParams.safeParse(request.params);
  const parsed = SaveEpisodePlaybackProgressBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: "Invalid episode progress." });
    return;
  }
  await savePlaybackProgress(
    params.data.slug,
    params.data.episodeId,
    response.locals.session.user.id,
    parsed.data.progressSeconds,
    parsed.data.durationSeconds,
    response,
  );
});

router.get("/site-config", async (_request, response) => {
  const [record] = await db.select().from(siteSettings).where(eq(siteSettings.id, "default")).limit(1);
  const value = record?.value as Record<string, unknown> | undefined;
  const name = typeof value?.name === "string" ? value.name : "FamilyFlix";
  const tagline = typeof value?.tagline === "string"
    ? value.tagline
    : "Rights-reviewed films and series within DemureGram.";
  const contactName = process.env.COPYRIGHT_CONTACT_NAME?.trim();
  const contactEmail = process.env.COPYRIGHT_CONTACT_EMAIL?.trim();
  const contactAddress = process.env.COPYRIGHT_CONTACT_ADDRESS?.trim();
  const copyrightContact = contactName && contactEmail && contactAddress
    ? { name: contactName, email: contactEmail, address: contactAddress }
    : null;
  response.json({ name, tagline, copyrightContactReady: Boolean(copyrightContact), copyrightContact });
});

router.get("/ai/tts", async (request, response) => {
  const text = typeof request.query.text === "string" ? request.query.text.trim() : "";
  const voice = typeof request.query.voice === "string" ? request.query.voice.trim() : "emma";

  if (!text) {
    response.status(400).json({ error: "Missing required 'text' parameter." });
    return;
  }

  // Cap maximum speech request length to 2000 characters
  if (text.length > 2000) {
    response.status(400).json({ error: "Text exceeds maximum allowed length of 2000 characters." });
    return;
  }

  try {
    const audio = await generateHumanSpeech(text, voice);
    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Content-Length", audio.length);
    response.setHeader("Cache-Control", "public, max-age=86400, immutable");
    response.setHeader("Accept-Ranges", "bytes");
    response.send(audio);
  } catch (error: unknown) {
    logger.error({ err: error }, "Failed to generate human speech audio");
    response.status(500).json({ error: "Speech generation failed. Please try again." });
  }
});

export default router;
