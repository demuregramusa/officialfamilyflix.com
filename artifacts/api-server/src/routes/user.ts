import { Router } from "express";
import { eq } from "drizzle-orm";
import { SaveUserPreferencesBody } from "@workspace/api-zod";
import { db, user } from "@workspace/db";
import { requireSession } from "../lib/auth-middleware";

const router = Router();

router.get("/user/preferences", requireSession, async (_request, response) => {
  const session = response.locals.session;
  const [record] = await db
    .select({
      favoriteGenres: user.favoriteGenres,
      onboarded: user.onboarded,
    })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  response.json(record ?? { favoriteGenres: [], onboarded: false });
});

router.put("/user/preferences", requireSession, async (request, response) => {
  const parsed = SaveUserPreferencesBody.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid preferences." });
    return;
  }
  const session = response.locals.session;
  const [record] = await db
    .update(user)
    .set({
      favoriteGenres: parsed.data.favoriteGenres,
      onboarded: parsed.data.onboarded,
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id))
    .returning({
      favoriteGenres: user.favoriteGenres,
      onboarded: user.onboarded,
    });
  response.json(record ?? { favoriteGenres: [], onboarded: false });
});

export default router;
