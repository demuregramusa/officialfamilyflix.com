import { eq } from "drizzle-orm";

import { getSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/auth-schema";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string | null;
  favoriteGenres: string[];
  onboarded: boolean;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const session = await getSession();
  if (!session) return null;

  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      favoriteGenres: user.favoriteGenres,
      onboarded: user.onboarded,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    favoriteGenres: Array.isArray(row.favoriteGenres) ? row.favoriteGenres : [],
  };
}
