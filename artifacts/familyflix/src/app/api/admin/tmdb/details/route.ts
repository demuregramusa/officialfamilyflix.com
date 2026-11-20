import { NextResponse } from "next/server";

import { jsonError, requireStaffApi } from "@/lib/admin/api";
import { getTmdbDetails, tmdbConfigured } from "@/lib/video/tmdb";

export async function GET(request: Request) {
  const auth = await requireStaffApi("tmdb.import", request);
  if (auth.response) return auth.response;

  if (!tmdbConfigured()) {
    return jsonError(
      "TMDb is not configured. Add TMDB_API_KEY (or TMDB_READ_ACCESS_TOKEN) to enable metadata import.",
      503,
    );
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const id = Number(searchParams.get("id"));

  if ((kind !== "movie" && kind !== "series") || !Number.isInteger(id) || id <= 0) {
    return jsonError("Choose a valid TMDb title.");
  }

  try {
    const details = await getTmdbDetails(kind, id);
    return NextResponse.json({ details });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "TMDb lookup failed.",
      502,
    );
  }
}
