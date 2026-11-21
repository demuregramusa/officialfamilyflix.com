import { Router } from "express";
import {
  GetPublicTitleParams,
  GetPlaybackParams,
  GetEpisodePlaybackParams,
  ListPublicTitlesQueryParams,
} from "@workspace/api-zod";
import { db, siteSettings } from "@workspace/db";
import { getCatalogRows, getEpisodePlaybackForRow, getPlaybackForRow, getPublicCatalogRowBySlug, toPublicTitle, toPublicTitleDetail } from "../lib/catalog";
import { validatePublicHttpUrl } from "../lib/rights";
import { eq } from "drizzle-orm";
import { importedTorrentSources } from "@workspace/db";
import {
  openApprovedTorrentMedia,
  parseSingleByteRange,
  setTorrentClientErrorHandler,
  stopTorrentSourceStreams,
} from "../lib/torrent-playback";
import { logger } from "../lib/logger";
import { isTorrentPlaybackEligible } from "../lib/torrent-source-policy.mjs";

setTorrentClientErrorHandler((error) => {
  logger.error({ err: error }, "Torrent client reported an error");
});

const router = Router();

async function serveTorrentMedia(
  request: import("express").Request,
  response: import("express").Response,
  slug: string,
  headOnly = false,
): Promise<void> {
  const row = await getPublicCatalogRowBySlug(slug);
  const expectedUrl = `/api/playback/${encodeURIComponent(slug)}/media`;
  if (!row || !row.torrent || row.movie.kind === "series") {
    response.status(404).json({ error: "This torrent-backed title is not available." });
    return;
  }
  const playback = await getPlaybackForRow(row);
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
    request.log?.warn({ titleId: row.movie.id, torrentId: source.id, err: error }, "Approved torrent media is unavailable");
    response.status(503).json({ error: "The approved video source is currently unavailable." });
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
  if (headOnly) {
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

router.get("/v1/titles", async (request, response) => {
  const parsed = ListPublicTitlesQueryParams.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid catalog filters." });
    return;
  }
  const rows = await getCatalogRows(parsed.data);
  response.json(rows.map(toPublicTitle));
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
  const urlIssue = validatePublicHttpUrl(playback.url);
  if (urlIssue || /magnet|torrent/i.test(playback.url)) {
    request.log?.error({ episodeId: parsed.data.episodeId }, "Episode playback source failed the media URL policy");
    response.status(403).json({ error: "This media source is not accepted for playback." });
    return;
  }
  response.json(playback);
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

export default router;
