import { NextResponse } from "next/server";

import { getSettings } from "@/lib/admin/settings";
import { API_ACCESS_ERROR, resolveApiAccess } from "@/lib/api/auth";
import {
  clientIdentifier,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/api/rate-limit";
import { CORS_HEADERS, jsonError } from "@/lib/api/responses";
import { requestOrigin } from "@/lib/api/origin";
import {
  API_SORTS,
  queryTitles,
  toApiTitle,
} from "@/lib/api/titles";
import { allGenres } from "@/lib/catalog";
import { site } from "@/lib/site";
import { TMDB_ATTRIBUTION } from "@/lib/video/tmdb";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const TYPES = new Set(["movie", "series", "live"]);

function parseInteger(value: string | null, fallback: number, min: number, max: number) {
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export async function GET(request: Request) {
  const origin = requestOrigin(request);
  const access = resolveApiAccess(request);

  if (access.keyed && !access.licensed) {
    return jsonError("invalid_api_key", API_ACCESS_ERROR, 401);
  }

  const settings = await getSettings();
  if (!settings.developer.apiEnabled) {
    return jsonError(
      "api_disabled",
      "The catalog API is temporarily disabled by the site operator.",
      503,
    );
  }

  const limit = access.licensed
    ? site.developer.licensedRateLimit
    : site.developer.publicRateLimit;
  const rate = rateLimit(
    `titles:${access.licensed ? "licensed" : "public"}:${clientIdentifier(request)}`,
    limit,
    site.developer.rateWindowMinutes * 60_000,
  );
  const headers = rateLimitHeaders(rate);

  if (!rate.allowed) {
    return jsonError(
      "rate_limited",
      "Rate limit exceeded. Retry after the time in the Retry-After header, or request a licensed key for a higher limit.",
      429,
      headers,
    );
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type")?.toLowerCase() ?? undefined;
  const genre = url.searchParams.get("genre")?.trim() || undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;
  const sort = url.searchParams.get("sort") ?? "score";

  if (type && !TYPES.has(type)) {
    return jsonError(
      "invalid_type",
      'The "type" filter must be movie, series or live.',
      400,
      headers,
    );
  }
  if (!API_SORTS.includes(sort)) {
    return jsonError(
      "invalid_sort",
      `The "sort" value must be one of: ${API_SORTS.join(", ")}.`,
      400,
      headers,
    );
  }

  const pageSize = parseInteger(url.searchParams.get("limit"), 24, 1, 100);
  const offset = parseInteger(url.searchParams.get("offset"), 0, 0, 10_000);
  const { items, total } = queryTitles({
    type,
    genre,
    q,
    sort,
    limit: pageSize,
    offset,
  });

  return NextResponse.json(
    {
      data: items.map((title) => toApiTitle(title, origin)),
      pagination: {
        total,
        limit: pageSize,
        offset,
        hasMore: offset + items.length < total,
      },
      meta: {
        apiVersion: "v1",
        generatedAt: new Date().toISOString(),
        access: access.licensed ? "licensed" : "public",
        attribution: TMDB_ATTRIBUTION,
        docs: `${origin}/developers`,
        licenseNotice:
          "Commercial embedding requires a one-time FamilyFlix Developer License.",
        developerLicense: {
          name: site.developer.licenseName,
          fee: site.developer.licenseFee,
          currency: site.developer.currency,
          contact: site.contact.developers,
        },
        rateLimit: {
          limit: rate.limit,
          remaining: rate.remaining,
          resetAt: new Date(rate.resetAt).toISOString(),
        },
        facets: {
          types: [...TYPES],
          genres: allGenres,
          sorts: API_SORTS,
        },
      },
    },
    { headers: { "Cache-Control": "no-store", ...CORS_HEADERS, ...headers } },
  );
}
