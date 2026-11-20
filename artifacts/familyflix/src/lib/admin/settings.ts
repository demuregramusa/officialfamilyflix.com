import { eq } from "drizzle-orm";
import { z } from "zod";

import { logAudit, type AdminSessionInfo } from "@/lib/admin/movies";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";

const linkSchema = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) => value === "" || value.startsWith("/") || /^https?:\/\//.test(value),
    "Use a site path such as /movies or a full http(s) URL.",
  );

export const siteSettingsSchema = z.object({
  site: z.object({
    name: z.string().trim().min(1, "Add the site name.").max(60),
    tagline: z.string().trim().max(160),
    supportEmail: z.email("Enter a valid support email.").max(160),
  }),
  announcement: z.object({
    enabled: z.boolean(),
    message: z.string().trim().max(240),
    href: linkSchema,
    label: z.string().trim().max(40),
  }),
  maintenance: z.object({
    enabled: z.boolean(),
    message: z.string().trim().max(300),
  }),
  playback: z
    .object({
      adsEnabled: z.boolean(),
      adDurationSeconds: z.number().int().min(0).max(120),
      adSkipAfterSeconds: z.number().int().min(0).max(120),
      trailersEnabled: z.boolean(),
    })
    .refine((value) => value.adSkipAfterSeconds <= value.adDurationSeconds, {
      message: "Skip time must be less than or equal to the ad length.",
      path: ["adSkipAfterSeconds"],
    }),
  developer: z.object({
    apiEnabled: z.boolean(),
    embedsEnabled: z.boolean(),
  }),
  moderation: z.object({
    writesPer10Minutes: z.number().int().min(1).max(500),
    importsPer10Minutes: z.number().int().min(1).max(200),
  }),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const DEFAULT_SETTINGS: SiteSettings = {
  site: {
    name: "FamilyFlix",
    tagline: "Free movies and TV for the whole family.",
    supportEmail: "support@familyflix.com",
  },
  announcement: {
    enabled: false,
    message: "New this week: public-domain classics and family favourites.",
    href: "/movies",
    label: "Browse",
  },
  maintenance: {
    enabled: false,
    message:
      "FamilyFlix is getting a quick tune-up. Movies are back shortly — thanks for your patience.",
  },
  playback: {
    adsEnabled: true,
    adDurationSeconds: 15,
    adSkipAfterSeconds: 5,
    trailersEnabled: true,
  },
  developer: {
    apiEnabled: true,
    embedsEnabled: true,
  },
  moderation: {
    writesPer10Minutes: 40,
    importsPer10Minutes: 15,
  },
};

export interface PublicSiteConfig {
  siteName: string;
  tagline: string;
  supportEmail: string;
  announcement: SiteSettings["announcement"];
  maintenance: SiteSettings["maintenance"];
  playback: SiteSettings["playback"];
}

const CACHE_TTL_MS = 15_000;

const settingsCache = globalThis as unknown as {
  __familyflixSettings?: { value: SiteSettings; expiresAt: number };
};

export function clearSettingsCache() {
  settingsCache.__familyflixSettings = undefined;
}

function mergeWithDefaults(stored: unknown): SiteSettings {
  const raw =
    stored && typeof stored === "object" ? (stored as Record<string, unknown>) : {};
  const defaults = DEFAULT_SETTINGS as unknown as Record<
    string,
    Record<string, unknown>
  >;

  const merged: Record<string, Record<string, unknown>> = {};
  for (const [section, values] of Object.entries(defaults)) {
    const candidate = raw[section];
    merged[section] = {
      ...values,
      ...(candidate && typeof candidate === "object"
        ? (candidate as Record<string, unknown>)
        : {}),
    };
  }

  const parsed = siteSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function getSettings(): Promise<SiteSettings> {
  const cached = settingsCache.__familyflixSettings;
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value = DEFAULT_SETTINGS;

  try {
    const [row] = await db
      .select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.id, "default"))
      .limit(1);

    if (row) value = mergeWithDefaults(row.value);
  } catch {
    // A missing table or connection should not take the site down.
    value = DEFAULT_SETTINGS;
  }

  settingsCache.__familyflixSettings = {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return value;
}

export async function getPublicSiteConfig(): Promise<PublicSiteConfig> {
  const settings = await getSettings();
  return {
    siteName: settings.site.name,
    tagline: settings.site.tagline,
    supportEmail: settings.site.supportEmail,
    announcement: settings.announcement,
    maintenance: settings.maintenance,
    playback: settings.playback,
  };
}

export type SaveSettingsResult =
  | { ok: true; settings: SiteSettings }
  | { ok: false; error: string };

export async function saveSettings(
  input: unknown,
  session: AdminSessionInfo,
): Promise<SaveSettingsResult> {
  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the settings values.",
    };
  }

  await db
    .insert(siteSettings)
    .values({
      id: "default",
      value: parsed.data,
      updatedBy: session.userId,
    })
    .onConflictDoUpdate({
      target: siteSettings.id,
      set: {
        value: parsed.data,
        updatedBy: session.userId,
        updatedAt: new Date(),
      },
    });

  clearSettingsCache();

  try {
    await logAudit(session, "settings.update", "settings", null, {
      sections: Object.keys(parsed.data),
    });
  } catch {
    // The settings are saved even if the audit insert fails.
  }

  return { ok: true, settings: parsed.data };
}
