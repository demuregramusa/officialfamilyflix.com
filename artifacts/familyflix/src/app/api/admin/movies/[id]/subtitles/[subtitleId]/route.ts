import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { jsonError, requireStaffApi } from "@/lib/admin/api";
import { logAudit } from "@/lib/admin/movies";
import { db } from "@/lib/db";
import { subtitles } from "@/lib/db/schema";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; subtitleId: string }> },
) {
  const auth = await requireStaffApi("subtitle.manage", request);
  if (auth.response) return auth.response;

  const { id, subtitleId } = await context.params;
  const [deleted] = await db
    .delete(subtitles)
    .where(and(eq(subtitles.id, subtitleId), eq(subtitles.movieId, id)))
    .returning({ id: subtitles.id });

  if (!deleted) return jsonError("Subtitle track not found.", 404);

  await logAudit(auth.session, "subtitle.delete", "movie", id, { subtitleId });
  return NextResponse.json({ ok: true });
}
