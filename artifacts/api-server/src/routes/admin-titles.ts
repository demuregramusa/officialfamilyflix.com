import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { Router } from "express";
import {
  CreateAdminTitleBody,
  DeleteAdminTitleParams,
  GetAdminTitleParams,
  ListAdminTitlesQueryParams,
  PublishAdminTitleParams,
  ReviewTitleRightsBody,
  ReviewTitleRightsParams,
  SetTitleStreamBody,
  SetTitleStreamParams,
  SyncCloudflareStreamParams,
  UpdateAdminTitleBody,
  UpdateAdminTitleParams,
} from "@workspace/api-zod";
import {
  db,
  genres,
  importedMovieSources,
  importedTorrentSources,
  mediaRights,
  movieGenres,
  movies,
  videoAssets,
} from "@workspace/db";
type DatabaseQueries = Pick<typeof db, "select" | "insert" | "update" | "delete">;
import { requireCapability } from "../lib/auth-middleware";
import { logAudit } from "../lib/audit";
import { getAdminTitle, listAdminTitles } from "../lib/admin-titles";
import {
  createCloudflareUpload,
  getCloudflareAsset,
  mapCloudflareStatus,
} from "../lib/cloudflare";
import {
  checkManualMediaSource,
  isEvidenceComplete,
  rightsToInsert,
  validateRightsInput,
} from "../lib/rights";
import { isTorrentPlaybackEligible } from "../lib/torrent-source-policy.mjs";

const router = Router();

function slugBase(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100) || "title";
}

async function uniqueSlug(name: string) {
  const base = slugBase(name);
  let slug = base;
  let suffix = 2;
  while (true) {
    const [existing] = await db.select({ id: movies.id }).from(movies).where(eq(movies.slug, slug)).limit(1);
    if (!existing) return slug;
    slug = `${base}-${suffix++}`;
  }
}

function requestError(response: import("express").Response, error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "The request could not be completed.";
  response.status(status).json({ error: message });
}

function validateOptionalArtwork(input: {
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rights: { assetKind: string; assetUrl: string }[];
}) {
  const poster = input.rights.some((right) =>
    right.assetKind === "poster" && right.assetUrl === input.posterUrl,
  );
  const backdrop = input.rights.some((right) =>
    right.assetKind === "backdrop" && right.assetUrl === input.backdropUrl,
  );
  if (input.posterUrl && !poster) return "A poster needs its own matching rights record before it can be submitted.";
  if (input.backdropUrl && !backdrop) return "A backdrop needs its own matching rights record before it can be submitted.";
  return null;
}

async function saveGenres(tx: DatabaseQueries, movieId: string, names: string[]) {
  const normalized = [...new Map(names.map((name) => [name.trim().toLowerCase(), name.trim()])).values()]
    .filter(Boolean);
  for (const name of normalized) {
    const slug = slugBase(name);
    const [inserted] = await tx
      .insert(genres)
      .values({ name, slug })
      .onConflictDoNothing()
      .returning({ id: genres.id });
    const [genre] = inserted
      ? [inserted]
      : await tx.select({ id: genres.id }).from(genres).where(eq(genres.slug, slug)).limit(1);
    if (genre) {
      await tx.insert(movieGenres).values({ movieId, genreId: genre.id }).onConflictDoNothing();
    }
  }
}

async function storeStream(
  tx: DatabaseQueries,
  titleId: string,
  rightsId: string,
  input: {
    provider: "manual" | "cloudflare";
    mp4Url?: string | null;
    hlsUrl?: string | null;
    playbackId?: string | null;
    signedPlayback?: boolean;
  },
  actorId: string,
) {
  let status: "ready" | "processing" | "pending_upload" = "pending_upload";
  if (input.provider === "manual") {
    const issue = await checkManualMediaSource(input);
    if (issue) throw new Error(issue);
    status = "ready";
  } else if (!input.playbackId) {
    throw new Error("A Cloudflare playback ID is required.");
  }

  const values = {
    movieId: titleId,
    mediaRightId: rightsId,
    provider: input.provider,
    providerAssetId: input.provider === "cloudflare" ? input.playbackId ?? null : null,
    playbackId: input.playbackId ?? null,
    mp4Url: input.mp4Url ?? null,
    hlsUrl: input.hlsUrl ?? null,
    status,
    signedPlayback: input.signedPlayback ?? false,
    error: null,
    createdBy: actorId,
    updatedAt: new Date(),
  };
  await tx
    .insert(videoAssets)
    .values(values)
    .onConflictDoUpdate({ target: videoAssets.movieId, set: values });
}

router.get("/admin/titles", requireCapability("library.view"), async (request, response) => {
  const parsed = ListAdminTitlesQueryParams.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid title filters." });
    return;
  }
  response.json(await listAdminTitles(parsed.data));
});

router.post("/admin/titles", requireCapability("rights.manage"), async (request, response) => {
  const parsed = CreateAdminTitleBody.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid title data." });
    return;
  }
  const input = parsed.data;
  if (!input.uploaderAttested || input.rights.some((right) => !right.uploaderAttested)) {
    response.status(400).json({ error: "Confirm that you are authorized to submit this title and its rights records." });
    return;
  }
  const rightsIssue = input.rights.map(validateRightsInput).find(Boolean);
  if (rightsIssue) {
    response.status(400).json({ error: rightsIssue });
    return;
  }
  if (input.rights.filter((right) => right.assetKind === "main-video").length !== 1) {
    response.status(400).json({ error: "Add exactly one main-video rights record before creating the title." });
    return;
  }
  const artworkIssue = validateOptionalArtwork(input);
  if (artworkIssue) {
    response.status(400).json({ error: artworkIssue });
    return;
  }
  const session = response.locals.session;

  try {
    const slug = await uniqueSlug(input.name);
    const createdId = await db.transaction(async (tx) => {
      const [movie] = await tx.insert(movies).values({
        slug,
        name: input.name.trim(),
        kind: input.kind,
        tagline: input.tagline ?? null,
        synopsis: input.synopsis,
        year: input.year ?? null,
        rating: input.rating ?? null,
        durationMinutes: input.durationMinutes ?? null,
        cast: input.cast ?? [],
        creatorAttribution: input.creatorAttribution.trim(),
        featured: input.featured ?? false,
        status: "draft",
        posterUrl: null,
        backdropUrl: null,
        createdBy: session.user.id,
        updatedAt: new Date(),
      }).returning({ id: movies.id });
      const rightsRows = await tx.insert(mediaRights).values(
        input.rights.map((rights) => rightsToInsert(rights, movie.id, session)),
      ).returning({ id: mediaRights.id, assetKind: mediaRights.assetKind });
      await saveGenres(tx, movie.id, input.genres ?? []);
      if (input.stream) {
        const mainRights = rightsRows.filter((right) => right.assetKind === "main_video");
        if (mainRights.length !== 1) throw new Error("A title must have exactly one main-video rights record for its stream.");
        await storeStream(tx, movie.id, mainRights[0]!.id, input.stream, session.user.id);
      }
      return movie.id;
    });
    await logAudit(session, "title.create", "title", createdId, { status: "draft" });
    const title = await getAdminTitle(createdId);
    response.status(201).json(title);
  } catch (error) {
    requestError(response, error, 400);
  }
});

router.get("/admin/titles/:id", requireCapability("library.view"), async (request, response) => {
  const parsed = GetAdminTitleParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid title ID." });
    return;
  }
  const title = await getAdminTitle(parsed.data.id);
  if (!title) {
    response.status(404).json({ error: "Title not found." });
    return;
  }
  response.json(title);
});

router.patch("/admin/titles/:id", requireCapability("library.edit"), async (request, response) => {
  const params = UpdateAdminTitleParams.safeParse(request.params);
  const parsed = UpdateAdminTitleBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: (!parsed.success && parsed.error.issues[0]?.message) || "Invalid title update." });
    return;
  }
  const [current] = await db.select().from(movies).where(eq(movies.id, params.data.id)).limit(1);
  if (!current) {
    response.status(404).json({ error: "Title not found." });
    return;
  }
  const input = parsed.data;
  const update: Partial<typeof movies.$inferInsert> = { updatedAt: new Date() };
  for (const key of [
    "name", "kind", "synopsis", "year", "tagline", "creatorAttribution",
    "rating", "durationMinutes", "cast", "featured",
  ] as const) {
    if (input[key] !== undefined) {
      (update as Record<string, unknown>)[key] = input[key];
    }
  }
  await db.update(movies).set(update).where(eq(movies.id, current.id));
  if (input.genres) {
    await db.transaction(async (tx) => {
      await tx.delete(movieGenres).where(eq(movieGenres.movieId, current.id));
      await saveGenres(tx, current.id, input.genres!);
    });
  }
  const session = response.locals.session;
  await logAudit(session, "title.update", "title", current.id, { fields: Object.keys(input) });
  response.json(await getAdminTitle(current.id));
});

router.delete("/admin/titles/:id", requireCapability("library.delete"), async (request, response) => {
  const parsed = DeleteAdminTitleParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid title ID." });
    return;
  }
  const [movie] = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, parsed.data.id)).limit(1);
  if (!movie) {
    response.status(404).json({ error: "Title not found." });
    return;
  }
  await db.update(movies).set({ status: "archived", publishedAt: null, updatedAt: new Date() }).where(eq(movies.id, movie.id));
  await logAudit(response.locals.session, "title.archive", "title", movie.id);
  response.status(204).end();
});

router.post("/admin/titles/:id/review", requireCapability("rights.manage"), async (request, response) => {
  const params = ReviewTitleRightsParams.safeParse(request.params);
  const parsed = ReviewTitleRightsBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: (!parsed.success && parsed.error.issues[0]?.message) || "Select rights records and a decision." });
    return;
  }
  const { id } = params.data;
  const [movie] = await db.select().from(movies).where(eq(movies.id, id)).limit(1);
  if (!movie) {
    response.status(404).json({ error: "Title not found." });
    return;
  }
  const ids = [...new Set(parsed.data.rightsIds)];
  const selected = await db.select().from(mediaRights).where(and(
    eq(mediaRights.movieId, id),
    inArray(mediaRights.id, ids),
  ));
  if (selected.length !== ids.length) {
    response.status(400).json({ error: "One or more selected rights records do not belong to this title." });
    return;
  }
  if (["approve", "restore"].includes(parsed.data.decision)) {
    const incomplete = selected.find((record) => !isEvidenceComplete(record));
    if (incomplete) {
      response.status(409).json({ error: `Rights evidence for “${incomplete.assetLabel}” is incomplete, expired, or unlicensed.` });
      return;
    }
  }
  const nextStatus = parsed.data.decision === "approve" || parsed.data.decision === "restore"
    ? "approved"
    : parsed.data.decision === "reject" ? "rejected" : "restricted";
  const session = response.locals.session;
  await db.transaction(async (tx) => {
    await tx.update(mediaRights).set({
      reviewStatus: nextStatus,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      reviewNotes: parsed.data.note,
      updatedAt: new Date(),
    }).where(inArray(mediaRights.id, ids));
    if (["reject", "restrict"].includes(parsed.data.decision) &&
        selected.some((record) => record.assetKind === "main_video")) {
      await tx.update(movies).set({
        status: "archived",
        publishedAt: null,
        updatedAt: new Date(),
      }).where(eq(movies.id, id));
    }
  });
  await logAudit(session, `rights.${parsed.data.decision}`, "title", id, {
    rightsIds: ids,
    note: parsed.data.note,
  });
  response.json(await getAdminTitle(id));
});

router.post("/admin/titles/:id/publish", requireCapability("library.publish"), async (request, response) => {
  const parsed = PublishAdminTitleParams.safeParse(request.params);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid title ID." });
    return;
  }
  const [movie] = await db.select().from(movies).where(eq(movies.id, parsed.data.id)).limit(1);
  if (!movie) {
    response.status(404).json({ error: "Title not found." });
    return;
  }
  const [rights, video, torrentRows] = await Promise.all([
    db.select().from(mediaRights).where(eq(mediaRights.movieId, movie.id)),
    db.select().from(videoAssets).where(eq(videoAssets.movieId, movie.id)).limit(1),
    db.select({ torrent: importedTorrentSources })
      .from(importedTorrentSources)
      .innerJoin(importedMovieSources, eq(importedTorrentSources.movieSourceId, importedMovieSources.id))
      .where(eq(importedMovieSources.movieId, movie.id)),
  ]);
  const currentRights = rights.filter((record) => record.movieId === movie.id);
  const main = currentRights.find((record) => record.assetKind === "main_video");
  const stream = video[0];
  const activeTorrent = torrentRows.some(({ torrent }) => isTorrentPlaybackEligible(torrent, true));
  const mediaReady = movie.kind === "series" ||
    (currentRights.filter((record) => record.assetKind === "main_video").length === 1 &&
      !!main && (
        (!!stream && stream.status === "ready" && stream.mediaRightId === main.id) ||
        activeTorrent
      ));
  if (
    !currentRights.length ||
    currentRights.some((record) => !isEvidenceComplete(record) || record.reviewStatus !== "approved") ||
    !mediaReady
  ) {
    response.status(409).json({ error: movie.kind === "series"
      ? "All series-level rights must be reviewed and current before publication."
      : "All media rights must be reviewed and current, with either a ready hosted stream or an active, rights-approved torrent source." });
    return;
  }
  await db.update(movies).set({
    status: "published",
    publishedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(movies.id, movie.id));
  await logAudit(response.locals.session, "title.publish", "title", movie.id);
  response.json(await getAdminTitle(movie.id));
});

router.put("/admin/titles/:id/stream", requireCapability("stream.manage"), async (request, response) => {
  const params = SetTitleStreamParams.safeParse(request.params);
  const parsed = SetTitleStreamBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    response.status(400).json({ error: (!parsed.success && parsed.error.issues[0]?.message) || "Invalid stream source." });
    return;
  }
  const [movie] = await db.select().from(movies).where(eq(movies.id, params.data.id)).limit(1);
  if (!movie) {
    response.status(404).json({ error: "Title not found." });
    return;
  }
  const mainRights = await db.select().from(mediaRights).where(and(
    eq(mediaRights.movieId, movie.id),
    eq(mediaRights.assetKind, "main_video"),
  ));
  if (mainRights.length !== 1) {
    response.status(409).json({ error: "Add exactly one main-video rights record before attaching a stream." });
    return;
  }
  const session = response.locals.session;
  try {
    await db.transaction(async (tx) => {
      await storeStream(tx, movie.id, mainRights[0]!.id, parsed.data, session.user.id);
      await tx.update(mediaRights).set({
        reviewStatus: "pending",
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
        updatedAt: new Date(),
      }).where(eq(mediaRights.id, mainRights[0]!.id));
      await tx.update(movies).set({
        status: "draft",
        publishedAt: null,
        updatedAt: new Date(),
      }).where(eq(movies.id, movie.id));
    });
  } catch (error) {
    requestError(response, error);
    return;
  }
  await logAudit(session, "stream.set", "title", movie.id, { provider: parsed.data.provider });
  response.json(await getAdminTitle(movie.id));
});

router.post("/admin/titles/:id/stream/direct-upload", requireCapability("stream.manage"), async (request, response) => {
  const params = SetTitleStreamParams.safeParse(request.params);
  if (!params.success) {
    response.status(400).json({ error: "Invalid title ID." });
    return;
  }
  const [movie] = await db.select().from(movies).where(eq(movies.id, params.data.id)).limit(1);
  if (!movie) {
    response.status(404).json({ error: "Title not found." });
    return;
  }
  if (movie.kind === "live") {
    response.status(400).json({ error: "Live channels cannot use a movie upload." });
    return;
  }
  const mainRights = await db.select().from(mediaRights).where(and(
    eq(mediaRights.movieId, movie.id),
    eq(mediaRights.assetKind, "main_video"),
  ));
  if (mainRights.length !== 1) {
    response.status(409).json({ error: "Add exactly one main-video rights record before uploading media." });
    return;
  }
  const right = mainRights[0]!;
  try {
    const upload = await createCloudflareUpload({ titleName: movie.name, titleId: movie.id });
    const values = {
      movieId: movie.id,
      mediaRightId: right.id,
      provider: "cloudflare" as const,
      providerAssetId: upload.uid,
      playbackId: null,
      hlsUrl: null,
      mp4Url: null,
      thumbnailUrl: null,
      status: "pending_upload" as const,
      signedPlayback: false,
      error: null,
      createdBy: response.locals.session.user.id,
      updatedAt: new Date(),
    };
    await db.insert(videoAssets).values(values)
      .onConflictDoUpdate({ target: videoAssets.movieId, set: values });
    await db.update(mediaRights).set({
      reviewStatus: "pending",
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      updatedAt: new Date(),
    }).where(eq(mediaRights.id, right.id));
    await db.update(movies).set({ status: "draft", publishedAt: null, updatedAt: new Date() })
      .where(eq(movies.id, movie.id));
    await logAudit(response.locals.session, "stream.direct_upload", "title", movie.id, {
      providerAssetId: upload.uid,
    });
    response.status(201).json({ uploadUrl: upload.uploadURL, assetId: upload.uid });
  } catch (error) {
    requestError(response, error, /not configured/i.test(error instanceof Error ? error.message : "") ? 503 : 502);
  }
});

router.post("/admin/titles/:id/stream/sync", requireCapability("stream.manage"), async (request, response) => {
  const params = SyncCloudflareStreamParams.safeParse(request.params);
  if (!params.success) {
    response.status(400).json({ error: "Invalid title ID." });
    return;
  }
  const [video] = await db.select().from(videoAssets).where(eq(videoAssets.movieId, params.data.id)).limit(1);
  if (!video || video.provider !== "cloudflare" || !video.providerAssetId) {
    response.status(404).json({ error: "No Cloudflare Stream asset is attached to this title." });
    return;
  }
  try {
    const asset = await getCloudflareAsset(video.providerAssetId);
    const status = mapCloudflareStatus(asset);
    await db.update(videoAssets).set({
      status,
      hlsUrl: asset.playback?.hls ?? null,
      thumbnailUrl: asset.thumbnail ?? null,
      durationSeconds: typeof asset.duration === "number" ? Math.round(asset.duration) : null,
      sizeBytes: typeof asset.size === "number" ? asset.size : null,
      width: asset.input?.width ?? null,
      height: asset.input?.height ?? null,
      error: status === "error" ? asset.status?.errorReasonText ?? asset.status?.errorReasonCode ?? "Processing failed." : null,
      updatedAt: new Date(),
    }).where(eq(videoAssets.id, video.id));
    await logAudit(response.locals.session, "stream.sync", "title", params.data.id, { status });
    response.json(await getAdminTitle(params.data.id));
  } catch (error) {
    requestError(response, error, /not configured/i.test(error instanceof Error ? error.message : "") ? 503 : 502);
  }
});

export default router;
