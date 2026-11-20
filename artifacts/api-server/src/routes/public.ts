import { Router } from "express";
import {
  GetPublicTitleParams,
  GetPlaybackParams,
  ListPublicTitlesQueryParams,
} from "@workspace/api-zod";
import { db, siteSettings } from "@workspace/db";
import { getCatalogRows, getPlaybackForRow, getPublicCatalogRowBySlug, toPublicTitle, toPublicTitleDetail } from "../lib/catalog";
import { validatePublicHttpUrl } from "../lib/rights";
import { eq } from "drizzle-orm";

const router = Router();

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
  const urlIssue = validatePublicHttpUrl(playback.url);
  if (urlIssue || /magnet|torrent/i.test(playback.url)) {
    request.log?.error({ titleId: row.movie.id }, "Playback source failed the media URL policy");
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
