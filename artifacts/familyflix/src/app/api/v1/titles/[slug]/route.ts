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
import { toApiTitle } from "@/lib/api/titles";
import { getTitle, relatedTitles } from "@/lib/catalog";
import { site } from "@/lib/site";
import { TMDB_ATTRIBUTION } from "@/lib/video/tmdb";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
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
    `title:${access.licensed ? "licensed" : "public"}:${clientIdentifier(request)}`,
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

  const { slug } = await context.params;
  const title = getTitle(slug);
  if (!title) {
    return jsonError("not_found", `No title matches "${slug}".`, 404, headers);
  }

  return NextResponse.json(
    {
      data: toApiTitle(title, origin),
      related: relatedTitles(title, 6)
        .map((relatedSlug) => getTitle(relatedSlug))
        .filter((related): related is NonNullable<typeof related> => Boolean(related))
        .map((related) => ({
          slug: related.slug,
          name: related.name,
          year: related.year,
          type: related.type,
          poster: toApiTitle(related, origin).images.poster,
        })),
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
      },
    },
    { headers: { "Cache-Control": "no-store", ...CORS_HEADERS, ...headers } },
  );
}
