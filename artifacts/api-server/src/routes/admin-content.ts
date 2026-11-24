import { and, asc, eq } from "drizzle-orm";
import { Router } from "express";
import {
  AddTitleRightsAssetBody,
  AddTitleRightsAssetParams,
  AddTitleSubtitleBody,
  AddTitleSubtitleParams,
  DeleteTitleSubtitleParams,
  ImportTitlesBody,
  ListTitleRightsAssetsParams,
  ListTitleSubtitlesParams,
  CreateAdminTitleBody,
} from "@workspace/api-zod";
import {
  db,
  genres,
  mediaRights,
  movieGenres,
  movies,
  subtitles,
  videoAssets,
} from "@workspace/db";
import type { TitleInput } from "@workspace/api-zod";
import { requireCapability } from "../lib/auth-middleware";
import { logAudit } from "../lib/audit";
import {
  checkDirectMediaSource,
  rightsFromDb,
  rightsToInsert,
  validateRightsInput,
} from "../lib/rights";
import { curatedPublicDomainTitles } from "../lib/curated-public-domain-titles";

const router = Router();

router.get(
  "/admin/import/public-domain-starter-pack",
  requireCapability("library.import"),
  (_request, response): void => {
    response.json(curatedPublicDomainTitles.map((title) => CreateAdminTitleBody.parse(title)));
  },
);

function jsonError(response: import("express").Response, message: string, status = 400) {
  response.status(status).json({ error: message });
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (char === '"' && quoted && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim())) rows.push(row);
  }
  if (rows.length < 2) return [];
  const headers = rows[0]!.map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error("CSV headers cannot be blank.");
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""])),
  );
}

function parseJsonArray(payload: string): unknown[] {
  const value: unknown = JSON.parse(payload);
  if (!Array.isArray(value)) throw new Error("JSON imports must be an array of title records.");
  return value;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((entry) => entry.trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((entry) => entry.trim()).filter(Boolean);
  } catch {
    // CSV cells may use a plain comma-separated list.
  }
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function expandCsvRow(row: Record<string, string>) {
  let rights: unknown;
  if (row.rights) {
    rights = JSON.parse(row.rights);
  } else {
    const assetUrl = row.assetUrl || row.mp4Url || row.hlsUrl || "";
    rights = [{
      assetKind: "main-video",
      assetLabel: row.assetLabel || "Main video",
      assetUrl,
      rightsHolder: row.rightsHolder || "",
      creatorAttribution: row.rightsCreatorAttribution || row.creatorAttribution || "",
      licenseType: row.licenseType || "",
      licenseVersion: row.licenseVersion || "",
      licenseUrl: row.licenseUrl || "",
      usageRestrictions: parseList(row.usageRestrictions || row.restrictions),
      sourceUrl: row.sourceUrl || "",
      evidenceUrl: row.evidenceUrl || "",
      evidenceNotes: row.evidenceNotes || null,
      territory: row.territory || null,
      expiresAt: row.expiresAt || null,
      uploaderAttested: true,
    }];
  }

  const stream = row.hlsUrl
    ? { provider: "manual", hlsUrl: row.hlsUrl, signedPlayback: false }
    : row.mp4Url
      ? { provider: "manual", mp4Url: row.mp4Url, signedPlayback: false }
      : null;
  return {
    name: row.name,
    kind: row.kind || "movie",
    synopsis: row.synopsis || "",
    year: row.year ? Number(row.year) : null,
    tagline: row.tagline || null,
    creatorAttribution: row.creatorAttribution || "",
    rating: row.rating || null,
    durationMinutes: row.durationMinutes ? Number(row.durationMinutes) : null,
    genres: parseList(row.genres),
    cast: parseList(row.cast),
    featured: row.featured === "true",
    posterUrl: row.posterUrl || null,
    backdropUrl: row.backdropUrl || null,
    rights,
    uploaderAttested: true,
    ...(stream ? { stream } : {}),
  };
}

function hasTorrentReference(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasTorrentReference);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) =>
    /torrent|magnet/i.test(key) ||
    (typeof child === "string" && containsForbiddenTorrentLink(child)) ||
    hasTorrentReference(child),
  );
}

function containsForbiddenTorrentLink(value: string) {
  const text = value.trim();
  if (/^(?:magnet:|torrent:)/i.test(text) || /\.torrent(?:$|[?#])/i.test(text)) return true;
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    const parsed = new URL(text);
    return /magnet|torrent/i.test(`${parsed.protocol}${parsed.hostname}${parsed.pathname}${parsed.search}`);
  } catch {
    return false;
  }
}

async function insertDraft(
  input: TitleInput,
  actor: import("../lib/auth-middleware").RequestSession,
) {
  const slugBase = input.name.normalize("NFKD").toLowerCase()
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 100) || "title";
  let slug = slugBase;
  let suffix = 2;
  while (true) {
    const [existing] = await db.select({ id: movies.id }).from(movies).where(eq(movies.slug, slug)).limit(1);
    if (!existing) break;
    slug = `${slugBase}-${suffix++}`;
  }
  return db.transaction(async (tx) => {
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
      posterUrl: input.posterUrl ?? null,
      backdropUrl: input.backdropUrl ?? null,
      status: "draft",
      createdBy: actor.user.id,
      updatedAt: new Date(),
    }).returning({ id: movies.id, slug: movies.slug });
    const newRights = await tx.insert(mediaRights).values(
      input.rights.map((right) => rightsToInsert(right, movie.id, actor)),
    ).returning({ id: mediaRights.id, assetKind: mediaRights.assetKind });
    for (const name of [...new Set(input.genres ?? [])]) {
      const normalized = name.trim();
      if (!normalized) continue;
      const genreSlug = normalized.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const [genre] = await tx.insert(genres)
        .values({ name: normalized, slug: genreSlug })
        .onConflictDoNothing()
        .returning({ id: genres.id });
      const genreRecord = genre ?? (await tx.select({ id: genres.id })
        .from(genres)
        .where(eq(genres.slug, genreSlug))
        .limit(1))[0];
      if (genreRecord) {
        await tx.insert(movieGenres).values({ movieId: movie.id, genreId: genreRecord.id }).onConflictDoNothing();
      }
    }
    if (input.stream) {
      const main = newRights.filter((right) => right.assetKind === "main_video");
      if (main.length !== 1) throw new Error("A stream needs exactly one main-video rights record.");
      if (input.stream.provider !== "manual") {
        throw new Error("Import title metadata first, then attach Cloudflare Stream through the admin upload workflow.");
      }
      const url = input.stream.hlsUrl || input.stream.mp4Url;
      const issue = url ? validateStreamUrl(url, input.stream.hlsUrl ? "hls" : "mp4") : "Add a direct MP4 or HLS source.";
      if (issue) throw new Error(issue);
      await tx.insert(videoAssets).values({
        movieId: movie.id,
        mediaRightId: main[0]!.id,
        provider: "manual",
        mp4Url: input.stream.mp4Url ?? null,
        hlsUrl: input.stream.hlsUrl ?? null,
        status: "ready",
        signedPlayback: false,
        createdBy: actor.user.id,
        updatedAt: new Date(),
      });
    }
    return { id: movie.id, slug: movie.slug };
  });
}

function validateStreamUrl(value: string, type: "mp4" | "hls") {
  const urlIssue = validateRightsUrl(value);
  if (urlIssue) return urlIssue;
  const parsed = new URL(value);
  if (parsed.protocol !== "https:") return "Playback sources must use HTTPS.";
  if (parsed.username || parsed.password || (parsed.port && parsed.port !== "443")) {
    return "Playback sources cannot contain credentials or use a custom port.";
  }
  if (!parsed.pathname.toLowerCase().endsWith(type === "hls" ? ".m3u8" : ".mp4")) {
    return `The ${type.toUpperCase()} URL must end in .${type === "hls" ? "m3u8" : "mp4"}.`;
  }
  return null;
}

function validateRightsUrl(value: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return "Enter a valid HTTPS media URL.";
  }
  if (parsed.protocol !== "https:" || /torrent|magnet/i.test(`${parsed.hostname}${parsed.pathname}${parsed.search}`)) {
    return "Only secure, authorized HTTP media sources are accepted. Torrent and magnet links are not allowed.";
  }
  return null;
}

router.get("/admin/titles/:id/rights-assets", requireCapability("rights.manage"), async (request, response) => {
  const parsed = ListTitleRightsAssetsParams.safeParse(request.params);
  if (!parsed.success) {
    jsonError(response, "Invalid title ID.");
    return;
  }
  const rows = await db.select().from(mediaRights)
    .where(eq(mediaRights.movieId, parsed.data.id))
    .orderBy(asc(mediaRights.submittedAt));
  response.json(rows.map(rightsFromDb));
});

router.post("/admin/titles/:id/rights-assets", requireCapability("rights.manage"), async (request, response) => {
  const params = AddTitleRightsAssetParams.safeParse(request.params);
  const parsed = AddTitleRightsAssetBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    jsonError(response, (!parsed.success && parsed.error.issues[0]?.message) || "Invalid rights record.");
    return;
  }
  const [movie] = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, params.data.id)).limit(1);
  if (!movie) {
    jsonError(response, "Title not found.", 404);
    return;
  }
  const issue = validateRightsInput(parsed.data);
  if (issue) {
    jsonError(response, issue);
    return;
  }
  if (parsed.data.assetKind === "main-video") {
    const existing = await db.select({ id: mediaRights.id }).from(mediaRights).where(and(
      eq(mediaRights.movieId, movie.id),
      eq(mediaRights.assetKind, "main_video"),
    ));
    if (existing.length) {
      jsonError(response, "This title already has a main-video rights record. Replace it through a reviewed content update.");
      return;
    }
  }
  const session = response.locals.session;
  const [record] = await db.insert(mediaRights)
    .values(rightsToInsert(parsed.data, movie.id, session))
    .returning();
  await logAudit(session, "rights.submit", "title", movie.id, { rightsId: record.id, assetKind: record.assetKind });
  response.status(201).json(rightsFromDb(record));
});

router.get("/admin/titles/:id/subtitles", requireCapability("subtitle.manage"), async (request, response) => {
  const parsed = ListTitleSubtitlesParams.safeParse(request.params);
  if (!parsed.success) {
    jsonError(response, "Invalid title ID.");
    return;
  }
  const rows = await db.select({
    subtitle: subtitles,
    mediaRight: mediaRights,
  })
    .from(subtitles)
    .leftJoin(mediaRights, eq(subtitles.mediaRightId, mediaRights.id))
    .where(eq(subtitles.movieId, parsed.data.id))
    .orderBy(asc(subtitles.language));
  response.json(rows.map((row) => ({
    ...row.subtitle,
    rights: row.mediaRight ? rightsFromDb(row.mediaRight) : null,
  })));
});

router.post("/admin/titles/:id/subtitles", requireCapability("rights.manage"), async (request, response) => {
  const params = AddTitleSubtitleParams.safeParse(request.params);
  const parsed = AddTitleSubtitleBody.safeParse(request.body);
  if (!params.success || !parsed.success) {
    jsonError(response, (!parsed.success && parsed.error.issues[0]?.message) || "Invalid subtitle data.");
    return;
  }
  const [movie] = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, params.data.id)).limit(1);
  if (!movie) {
    jsonError(response, "Title not found.", 404);
    return;
  }
  const input = parsed.data;
  if (
    !input.uploaderAttested ||
    input.rights.assetKind !== "subtitle" ||
    input.rights.assetUrl !== input.url
  ) {
    jsonError(response, "Subtitle rights must be attested and describe the exact subtitle URL.");
    return;
  }
  const issue = validateRightsInput(input.rights);
  if (issue) {
    jsonError(response, issue);
    return;
  }
  const session = response.locals.session;
  try {
    const [right] = await db.insert(mediaRights)
      .values(rightsToInsert(input.rights, movie.id, session))
      .returning();
    const [subtitle] = await db.insert(subtitles).values({
      movieId: movie.id,
      mediaRightId: right.id,
      language: input.language,
      label: input.label,
      url: input.url,
      isDefault: false,
    }).returning();
    await logAudit(session, "subtitle.create", "title", movie.id, {
      subtitleId: subtitle.id,
      rightsId: right.id,
    });
    response.status(201).json({ ...subtitle, rights: rightsFromDb(right) });
  } catch {
    jsonError(response, "That subtitle language already exists for this title.", 409);
  }
});

router.delete("/admin/titles/:id/subtitles/:subtitleId", requireCapability("subtitle.manage"), async (request, response) => {
  const parsed = DeleteTitleSubtitleParams.safeParse(request.params);
  if (!parsed.success) {
    jsonError(response, "Invalid subtitle identifier.");
    return;
  }
  const [subtitle] = await db.select().from(subtitles).where(and(
    eq(subtitles.id, parsed.data.subtitleId),
    eq(subtitles.movieId, parsed.data.id),
  )).limit(1);
  if (!subtitle) {
    jsonError(response, "Subtitle not found.", 404);
    return;
  }
  await db.transaction(async (tx) => {
    await tx.delete(subtitles).where(eq(subtitles.id, subtitle.id));
    if (subtitle.mediaRightId) {
      await tx.update(mediaRights).set({
        reviewStatus: "restricted",
        reviewNotes: "Subtitle removed from the title.",
        reviewedBy: response.locals.session.user.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(mediaRights.id, subtitle.mediaRightId));
    }
  });
  await logAudit(response.locals.session, "subtitle.remove", "title", subtitle.movieId, { subtitleId: subtitle.id });
  response.status(204).end();
});

router.post("/admin/import", requireCapability("library.import"), async (request, response) => {
  const parsed = ImportTitlesBody.safeParse(request.body);
  if (!parsed.success) {
    jsonError(response, parsed.error.issues[0]?.message || "Invalid import request.");
    return;
  }
  const input = parsed.data;
  let rawRows: unknown[];
  try {
    rawRows = input.format === "json" ? parseJsonArray(input.payload) : parseCsv(input.payload).map(expandCsvRow);
  } catch (error) {
    jsonError(response, error instanceof Error ? error.message : "Could not parse import data.");
    return;
  }
  if (!rawRows.length) {
    jsonError(response, "The import contains no title rows.");
    return;
  }
  if (!input.dryRun && !input.uploaderAttested) {
    jsonError(response, "Confirm that you are authorized to submit the imported titles.");
    return;
  }

  const issues: { row: number; title: string | null; message: string }[] = [];
  const importedTitles: { row: number; id: string; slug: string; name: string; kind: string; action: "created" | "updated" }[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let pendingReview = 0;
  const session = response.locals.session;

  for (const [index, raw] of rawRows.entries()) {
    const rowNumber = index + 1;
    if (hasTorrentReference(raw)) {
      issues.push({ row: rowNumber, title: null, message: "Torrent or magnet references are not accepted. Use authorized direct media and rights evidence." });
      skipped += 1;
      continue;
    }
    const candidate = input.format === "json" ? raw : raw;
    const checked = CreateAdminTitleBody.safeParse(candidate);
    if (!checked.success) {
      const title = candidate && typeof candidate === "object" && "name" in candidate
        ? String((candidate as { name?: unknown }).name ?? "")
        : null;
      issues.push({ row: rowNumber, title, message: checked.error.issues[0]?.message ?? "The row does not match the required title and rights format." });
      skipped += 1;
      continue;
    }
    const titleInput = checked.data;
    const rightsIssue = titleInput.rights.map(validateRightsInput).find(Boolean);
    if (!titleInput.uploaderAttested || rightsIssue) {
      issues.push({
        row: rowNumber,
        title: titleInput.name,
        message: rightsIssue ?? "Every imported title requires an uploader rights attestation.",
      });
      skipped += 1;
      continue;
    }
    const posterMatches = !titleInput.posterUrl || titleInput.rights.some((right) =>
      right.assetKind === "poster" && right.assetUrl === titleInput.posterUrl,
    );
    const backdropMatches = !titleInput.backdropUrl || titleInput.rights.some((right) =>
      right.assetKind === "backdrop" && right.assetUrl === titleInput.backdropUrl,
    );
    if (!posterMatches || !backdropMatches) {
      issues.push({
        row: rowNumber,
        title: titleInput.name,
        message: "Every poster or backdrop URL needs a matching rights record for that exact asset.",
      });
      skipped += 1;
      continue;
    }
    if (!titleInput.rights.some((right) => right.assetKind === "main-video")) {
      issues.push({ row: rowNumber, title: titleInput.name, message: "Add a main-video rights record." });
      skipped += 1;
      continue;
    }
    if (titleInput.stream) {
      if (titleInput.stream.provider !== "manual") {
        issues.push({
          row: rowNumber,
          title: titleInput.name,
          message: "Import title metadata first, then attach Cloudflare Stream through the admin upload workflow.",
        });
        skipped += 1;
        continue;
      }
      const streamSources = [
        ...(titleInput.stream.hlsUrl ? [{ url: titleInput.stream.hlsUrl, type: "hls" as const }] : []),
        ...(titleInput.stream.mp4Url ? [{ url: titleInput.stream.mp4Url, type: "mp4" as const }] : []),
      ];
      if (!streamSources.length) {
        issues.push({
          row: rowNumber,
          title: titleInput.name,
          message: "Add a direct MP4 or HLS source.",
        });
        skipped += 1;
        continue;
      }
      let sourceIssue: string | null = null;
      for (const source of streamSources) {
        sourceIssue = validateStreamUrl(source.url, source.type);
        if (!sourceIssue) sourceIssue = await checkDirectMediaSource(source.url, source.type);
        if (sourceIssue) break;
      }
      if (sourceIssue) {
        issues.push({ row: rowNumber, title: titleInput.name, message: sourceIssue });
        skipped += 1;
        continue;
      }
    }
    const baseSlug = titleInput.name.normalize("NFKD").toLowerCase()
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "").slice(0, 100) || "title";
    const [existing] = await db.select().from(movies).where(eq(movies.slug, baseSlug)).limit(1);
    const [existingRights] = existing
      ? await db.select({ id: mediaRights.id }).from(mediaRights).where(eq(mediaRights.movieId, existing.id)).limit(1)
      : [];
    if (existing && (!input.updateExisting || existing.status !== "draft" || existingRights)) {
      issues.push({
        row: rowNumber,
        title: titleInput.name,
        message: existing.status === "draft" && !existingRights
          ? "A draft with this title already exists; enable update matching titles or edit that draft."
          : "A matching title already exists and cannot be overwritten by the importer.",
      });
      skipped += 1;
      continue;
    }
    if (input.dryRun) {
      pendingReview += titleInput.rights.length;
      if (existing) updated += 1;
      else created += 1;
      continue;
    }
    try {
      if (existing) {
        if (titleInput.stream?.provider !== undefined && titleInput.stream.provider !== "manual") {
          throw new Error("Import title metadata first, then attach Cloudflare Stream through the admin upload workflow.");
        }
        await db.transaction(async (tx) => {
          await tx.update(movies).set({
            name: titleInput.name.trim(),
            synopsis: titleInput.synopsis,
            kind: titleInput.kind,
            year: titleInput.year ?? null,
            tagline: titleInput.tagline ?? null,
            creatorAttribution: titleInput.creatorAttribution,
            rating: titleInput.rating ?? null,
            durationMinutes: titleInput.durationMinutes ?? null,
            cast: titleInput.cast ?? [],
            posterUrl: titleInput.posterUrl ?? existing.posterUrl ?? null,
            backdropUrl: titleInput.backdropUrl ?? existing.backdropUrl ?? null,
            status: "draft",
            publishedAt: null,
            updatedAt: new Date(),
          }).where(eq(movies.id, existing.id));
          const newRights = await tx.insert(mediaRights).values(
            titleInput.rights.map((right) => rightsToInsert(right, existing.id, session)),
          ).returning({ id: mediaRights.id, assetKind: mediaRights.assetKind });
          for (const name of [...new Set(titleInput.genres ?? [])]) {
            const normalized = name.trim();
            if (!normalized) continue;
            const genreSlug = normalized.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            const [genre] = await tx.insert(genres)
              .values({ name: normalized, slug: genreSlug })
              .onConflictDoNothing()
              .returning({ id: genres.id });
            const genreRecord = genre ?? (await tx.select({ id: genres.id }).from(genres).where(eq(genres.slug, genreSlug)).limit(1))[0];
            if (genreRecord) {
              await tx.insert(movieGenres).values({ movieId: existing.id, genreId: genreRecord.id }).onConflictDoNothing();
            }
          }
          if (titleInput.stream) {
            const main = newRights.filter((right) => right.assetKind === "main_video");
            const streamUrl = titleInput.stream.hlsUrl || titleInput.stream.mp4Url;
            const issue = streamUrl
              ? validateStreamUrl(streamUrl, titleInput.stream.hlsUrl ? "hls" : "mp4")
              : "Add a direct MP4 or HLS source.";
            if (issue) throw new Error(issue);
            await tx.insert(videoAssets).values({
              movieId: existing.id,
              mediaRightId: main[0]!.id,
              provider: "manual",
              mp4Url: titleInput.stream.mp4Url ?? null,
              hlsUrl: titleInput.stream.hlsUrl ?? null,
              status: "ready",
              signedPlayback: false,
              createdBy: session.user.id,
              updatedAt: new Date(),
            }).onConflictDoUpdate({
              target: videoAssets.movieId,
              set: {
                mediaRightId: main[0]!.id,
                provider: "manual",
                mp4Url: titleInput.stream.mp4Url ?? null,
                hlsUrl: titleInput.stream.hlsUrl ?? null,
                status: "ready",
                updatedAt: new Date(),
              },
            });
          }
        });
        pendingReview += titleInput.rights.length;
        updated += 1;
        importedTitles.push({
          row: rowNumber,
          id: existing.id,
          slug: existing.slug,
          name: titleInput.name.trim(),
          kind: titleInput.kind,
          action: "updated",
        });
      } else {
        const inserted = await insertDraft(titleInput, session);
        pendingReview += titleInput.rights.length;
        created += 1;
        importedTitles.push({
          row: rowNumber,
          id: inserted.id,
          slug: inserted.slug,
          name: titleInput.name.trim(),
          kind: titleInput.kind,
          action: "created",
        });
      }
    } catch (error) {
      issues.push({
        row: rowNumber,
        title: titleInput.name,
        message: error instanceof Error ? error.message : "This row could not be imported.",
      });
      skipped += 1;
    }
  }

  if (!input.dryRun && created + updated > 0) {
    await logAudit(session, "catalog.import", "catalog", null, {
      created,
      updated,
      skipped,
      pendingReview,
      format: input.format,
      titleIds: importedTitles.map((t) => t.id),
    });
  }
  response.json({
    dryRun: input.dryRun,
    total: rawRows.length,
    created: input.dryRun ? 0 : created,
    updated: input.dryRun ? 0 : updated,
    skipped,
    issues,
    pendingReview,
    importedTitles,
  });
});

export default router;
