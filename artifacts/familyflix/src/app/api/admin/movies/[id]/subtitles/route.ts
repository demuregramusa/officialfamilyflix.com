import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { firstIssue, jsonError, requireStaffApi } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/movies";
import { subtitleSchema } from "@/lib/admin/validation";
import { db } from "@/lib/db";
import { movies, subtitles } from "@/lib/db/schema";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("subtitle.manage", request);
  if (auth.response) return auth.response;

  const { id } = await context.params;
  const [movie] = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, id)).limit(1);
  if (!movie) return jsonError("Title not found.", 404);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError("Send a JSON body.");
  }

  const parsed = subtitleSchema.safeParse(payload);
  if (!parsed.success) return jsonError(firstIssue(parsed.error));

  if (parsed.data.isDefault) {
    await db
      .update(subtitles)
      .set({ isDefault: false })
      .where(eq(subtitles.movieId, id));
  }

  const values = {
    movieId: id,
    language: parsed.data.language,
    label: parsed.data.label,
    url: parsed.data.url,
    isDefault: parsed.data.isDefault,
  };

  const [subtitle] = await db
    .insert(subtitles)
    .values(values)
    .onConflictDoUpdate({
      target: [subtitles.movieId, subtitles.language],
      set: values,
    })
    .returning();

  await logAudit(auth.session, "subtitle.save", "movie", id, {
    language: parsed.data.language,
  });

  return NextResponse.json({ subtitle }, { status: 201 });
}
