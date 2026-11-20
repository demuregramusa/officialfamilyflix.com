import { NextResponse } from "next/server";

import { jsonError, requireStaffApi } from "@/lib/admin/api";
import { tmdbSearchSchema } from "@/lib/admin/validation";
import { searchTmdb, tmdbConfigured } from "@/lib/video/tmdb";

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
  const parsed = tmdbSearchSchema.safeParse({
    query: searchParams.get("q") ?? "",
    kind: searchParams.get("kind") ?? "movie",
  });
  if (!parsed.success) {
    return jsonError("Enter at least two characters and choose a type.");
  }

  try {
    const results = await searchTmdb(parsed.data.query, parsed.data.kind);
    return NextResponse.json({ results });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "TMDb search failed.",
      502,
    );
  }
}
