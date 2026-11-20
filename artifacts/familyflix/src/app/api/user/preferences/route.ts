import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";

const MAX_GENRES = 12;

function parseGenres(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;

  const seen = new Set<string>();
  const genres: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 40) return null;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    genres.push(trimmed);
    if (genres.length > MAX_GENRES) return null;
  }

  return genres;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Send a JSON body." }, { status: 400 });
  }

  const favoriteGenres = parseGenres(
    (payload as { favoriteGenres?: unknown }).favoriteGenres,
  );
  if (favoriteGenres === null) {
    return NextResponse.json(
      { error: "favoriteGenres must be a list of genre names." },
      { status: 400 },
    );
  }

  await db
    .update(user)
    .set({ favoriteGenres, onboarded: true })
    .where(eq(user.id, session.user.id));

  return NextResponse.json({ ok: true, favoriteGenres });
}

export const dynamic = "force-dynamic";
