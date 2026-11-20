import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { movies } from "@/lib/db/schema";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const emptyToNull = (value: string | null | undefined) =>
  value && value.trim().length > 0 ? value.trim() : null;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => emptyToNull(value));

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .nullable()
  .refine(
    (value) => !value || value.startsWith("https://") || value.startsWith("http://"),
    "Enter a full http(s) URL.",
  )
  .transform((value) => emptyToNull(value));

const episodeSchema = z.object({
  number: z.coerce.number().int().min(0).max(999),
  title: z.string().trim().min(1).max(160),
  synopsis: z.string().trim().max(2000).default(""),
  duration: z.string().trim().max(20).default(""),
});

const liveSchema = z.object({
  channel: z.string().trim().min(1).max(80),
  onNow: z.string().trim().min(1).max(160),
  next: z.string().trim().min(1).max(160),
  endsIn: z.coerce.number().int().min(0).max(1440),
});

const baseMovieSchema = createInsertSchema(movies, {
  name: (schema) => schema.min(1).max(160),
  slug: (schema) => schema.min(1).max(160).regex(slugPattern, "Use lowercase letters, numbers and dashes."),
  synopsis: (schema) => schema.min(1).max(4000),
  tagline: () => optionalText(220),
  rating: () => optionalText(20),
  badge: () => optionalText(40),
  creator: () => optionalText(160),
  imageId: () => optionalText(120),
  posterUrl: () => optionalUrl,
  backdropUrl: () => optionalUrl,
  licenseTerritory: () => optionalText(120),
  sourceUrl: () => optionalUrl,
  rightsHolder: () => optionalText(240),
  year: () => z.coerce.number().int().min(1900).max(2100).nullable().optional(),
  score: () => z.coerce.number().int().min(0).max(100).default(0),
  durationMinutes: () => z.coerce.number().int().min(1).max(1000).nullable().optional(),
  seasons: () => z.coerce.number().int().min(1).max(100).nullable().optional(),
  tmdbId: () => z.coerce.number().int().positive().nullable().optional(),
  licenseExpiresAt: () => z.coerce.date().nullable().optional(),
  palette: () =>
    z
      .tuple([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.string().regex(/^#[0-9a-fA-F]{6}$/)])
      .nullable()
      .optional(),
  cast: () => z.array(z.string().trim().min(1).max(120)).max(40).default([]),
  episodes: () => z.array(episodeSchema).max(200).default([]),
  live: () => liveSchema.nullable().optional(),
  featured: () => z.boolean().default(false),
  status: () => z.enum(["draft", "published", "archived"]).default("draft"),
  licenseType: () =>
    z.enum(["owned", "public_domain", "creative_commons", "licensed", "unlicensed"]).default("unlicensed"),
});

export const movieCreateSchema = baseMovieSchema
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    publishedAt: true,
    rightsConfirmedAt: true,
  })
  .extend({
    genres: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    rightsConfirmed: z.boolean().default(false),
  });

export const movieUpdateSchema = movieCreateSchema.partial();

export const manualStreamSchema = z
  .object({
    hlsUrl: optionalUrl,
    mp4Url: optionalUrl,
    thumbnailUrl: optionalUrl,
    durationSeconds: z.coerce.number().int().min(0).max(86400).nullable().optional(),
    signedPlayback: z.boolean().default(false),
  })
  .refine((value) => Boolean(value.hlsUrl || value.mp4Url), {
    message: "Provide an HLS manifest URL or an MP4 URL.",
    path: ["hlsUrl"],
  });

export const subtitleSchema = z.object({
  language: z
    .string()
    .trim()
    .min(2)
    .max(16)
    .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "Use a language code such as en or en-US."),
  label: z.string().trim().min(1).max(60),
  url: z
    .string()
    .trim()
    .max(2048)
    .refine((value) => value.startsWith("https://") || value.startsWith("/"), "Use an https URL or a site path."),
  isDefault: z.boolean().default(false),
});

export const tmdbSearchSchema = z.object({
  query: z.string().trim().min(2).max(120),
  kind: z.enum(["movie", "series"]).default("movie"),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, "Add the staff member's name.").max(80),
  email: z.email("Enter a valid email address.").max(160),
  password: z
    .string()
    .min(10, "Use at least 10 characters for the temporary password.")
    .max(128),
  role: z.enum(["admin", "moderator"]).default("moderator"),
});

export const staffUpdateSchema = z.object({
  action: z.enum(["role", "ban", "unban", "password"]),
  role: z.enum(["admin", "moderator"]).optional(),
  reason: z.string().trim().max(200).optional(),
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(128)
    .optional(),
});

export type MovieCreateInput = z.infer<typeof movieCreateSchema>;
export type MovieUpdateInput = z.infer<typeof movieUpdateSchema>;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}
