import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  aiConversations,
  aiCreditLedger,
  aiCreditWallets,
  aiMessages,
  aiUserPreferences,
  movies,
  playbackProgress,
  seriesEpisodes,
  siteSettings,
  user,
  userFavorites,
} from "@workspace/db";
import { getRequestSession } from "../lib/auth-middleware";
import { catalogService } from "../lib/catalog-service";
import { generateHumanSpeech } from "../lib/tts-service";
import { logger } from "../lib/logger";

const router = Router();

// Helper to ensure wallet and preferences exist for an authenticated user
async function ensureUserWalletAndPreferences(userId: string) {
  let [wallet] = await db
    .select()
    .from(aiCreditWallets)
    .where(eq(aiCreditWallets.userId, userId))
    .limit(1);

  if (!wallet) {
    const [created] = await db
      .insert(aiCreditWallets)
      .values({
        userId,
        balance: 100,
        plan: "free",
        totalUsed: 0,
        monthlyAllowance: 100,
      })
      .onConflictDoNothing()
      .returning();
    if (created) wallet = created;
    else {
      [wallet] = await db
        .select()
        .from(aiCreditWallets)
        .where(eq(aiCreditWallets.userId, userId))
        .limit(1);
    }

    // Record initial grant in ledger
    if (wallet) {
      await db.insert(aiCreditLedger).values({
        userId,
        type: "monthly_grant",
        amount: 100,
        balanceAfter: 100,
        description: "Welcome AI credit allowance (Free Tier)",
      });
    }
  }

  let [prefs] = await db
    .select()
    .from(aiUserPreferences)
    .where(eq(aiUserPreferences.userId, userId))
    .limit(1);

  if (!prefs) {
    const [created] = await db
      .insert(aiUserPreferences)
      .values({
        userId,
        selectedAssistant: "raven",
        voiceActivationEnabled: false,
        voiceSpeed: "1.00",
      })
      .onConflictDoNothing()
      .returning();
    if (created) prefs = created;
    else {
      [prefs] = await db
        .select()
        .from(aiUserPreferences)
        .where(eq(aiUserPreferences.userId, userId))
        .limit(1);
    }
  }

  return { wallet, prefs };
}

// 1. GET /api/v1/ai-concierge/account
// Retrieves current user's AI Concierge profile, remaining credits, and assistant settings
router.get("/account", async (request, response): Promise<void> => {
  try {
    const session = await getRequestSession(request);
    if (!session || !session.user) {
      response.json({
        authenticated: false,
        assistant: "raven",
        voiceActivationEnabled: false,
        credits: {
          balance: 0,
          plan: "none",
          totalUsed: 0,
          monthlyAllowance: 0,
        },
      });
      return;
    }

    const userId = session.user.id;
    const { wallet, prefs } = await ensureUserWalletAndPreferences(userId);

    response.json({
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      assistant: prefs?.selectedAssistant || "raven",
      voiceActivationEnabled: prefs?.voiceActivationEnabled ?? false,
      voiceSpeed: prefs?.voiceSpeed || "1.00",
      credits: {
        balance: wallet?.balance ?? 100,
        plan: wallet?.plan || "free",
        totalUsed: wallet?.totalUsed ?? 0,
        monthlyAllowance: wallet?.monthlyAllowance ?? 100,
        lastResetAt: wallet?.lastResetAt,
      },
    });
  } catch (err) {
    logger.error({ err }, "Error fetching AI concierge account");
    response.status(500).json({ error: "Failed to load AI Concierge account data." });
  }
});

// 2. POST /api/v1/ai-concierge/preferences
// Saves assistant preference (RAVEN vs PRINCETON) and voice activation settings
router.post("/preferences", async (request, response): Promise<void> => {
  try {
    const session = await getRequestSession(request);
    if (!session || !session.user) {
      response.status(401).json({ error: "Authentication required to save assistant preferences." });
      return;
    }

    const userId = session.user.id;
    const { assistant, voiceActivationEnabled, voiceSpeed } = request.body || {};

    const selectedAssistant = assistant === "princeton" ? "princeton" : "raven";
    const voiceEnabled = Boolean(voiceActivationEnabled);
    const speed = typeof voiceSpeed === "string" ? voiceSpeed : "1.00";

    await db
      .insert(aiUserPreferences)
      .values({
        userId,
        selectedAssistant,
        voiceActivationEnabled: voiceEnabled,
        voiceSpeed: speed,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: aiUserPreferences.userId,
        set: {
          selectedAssistant,
          voiceActivationEnabled: voiceEnabled,
          voiceSpeed: speed,
          updatedAt: new Date(),
        },
      });

    response.json({
      success: true,
      assistant: selectedAssistant,
      voiceActivationEnabled: voiceEnabled,
      voiceSpeed: speed,
    });
  } catch (err) {
    logger.error({ err }, "Error saving AI concierge preferences");
    response.status(500).json({ error: "Failed to update assistant preferences." });
  }
});

// 3. POST /api/v1/ai-concierge/chat
// Core conversational agent with Siri-Style FamilyFlix control & strict account scoping
router.post("/chat", async (request, response): Promise<void> => {
  try {
    const session = await getRequestSession(request);
    const userId = session?.user?.id ?? null;
    const userRole = session?.user?.role ?? "user";
    const userName = session?.user?.name || "Friend";

    const {
      message,
      assistant: requestedAssistant,
      conversationId: existingConvId,
      isVoice = false,
    } = request.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      response.status(400).json({ error: "A message prompt is required." });
      return;
    }

    const prompt = message.trim();
    const cost = isVoice ? 2 : 1;

    let assistantPersona: "raven" | "princeton" = requestedAssistant === "princeton" ? "princeton" : "raven";
    let wallet: typeof aiCreditWallets.$inferSelect | null = null;

    if (userId) {
      const ensured = await ensureUserWalletAndPreferences(userId);
      wallet = ensured.wallet;
      if (!requestedAssistant && ensured.prefs?.selectedAssistant) {
        assistantPersona = ensured.prefs.selectedAssistant as "raven" | "princeton";
      }

      // Check credit balance
      if (wallet && wallet.balance < cost) {
        response.status(402).json({
          error: "credits_exhausted",
          message:
            "Your AI credits have been used. Upgrade your plan or add more credits to continue using RAVEN and PRINCETON.",
          balance: wallet.balance,
          upgradeUrl: "/account",
        });
        return;
      }
    }

    // Ensure in-memory catalog cache is populated
    await catalogService.ensureLoaded();

    // Siri-Style Action Routing & Catalog Tool Execution
    const lowerPrompt = prompt.toLowerCase();
    let actionResult: any = null;
    let replyText = "";

    // 1. GREETING & PERSONA QUERIES
    if (/^(hi|hello|hey)\s*(raven|princeton)?/i.test(lowerPrompt) || /who are you/i.test(lowerPrompt)) {
      if (assistantPersona === "raven") {
        replyText = `Hello ${userName}! I'm RAVEN, your personal FamilyFlix streaming concierge. I can search our catalog of over 23,000 movies, start playback, track your watch progress, and help manage your account. What can I play for you today?`;
      } else {
        replyText = `Hey there ${userName}, I'm PRINCETON. Ready to help you discover great movies, launch your favorite TV shows, or answer any account questions. How can I assist you right now?`;
      }
    }
    // 2. ASSISTANT SWITCHING
    else if (/switch to princeton/i.test(lowerPrompt)) {
      assistantPersona = "princeton";
      if (userId) {
        await db
          .update(aiUserPreferences)
          .set({ selectedAssistant: "princeton", updatedAt: new Date() })
          .where(eq(aiUserPreferences.userId, userId));
      }
      replyText = `I've switched your assistant to PRINCETON. Hello! I'm now active and ready to help.`;
    } else if (/switch to raven/i.test(lowerPrompt)) {
      assistantPersona = "raven";
      if (userId) {
        await db
          .update(aiUserPreferences)
          .set({ selectedAssistant: "raven", updatedAt: new Date() })
          .where(eq(aiUserPreferences.userId, userId));
      }
      replyText = `I've switched your assistant back to RAVEN. How can I assist your viewing experience?`;
    }
    // 3. ACCOUNT & CREDITS INQUIRIES
    else if (/credit|balance|allowance|token/i.test(lowerPrompt)) {
      if (!userId || !wallet) {
        replyText = `Please sign in to your FamilyFlix account so I can verify your AI credit balance and subscription status.`;
      } else {
        const remaining = wallet.balance;
        replyText = `You currently have ${remaining} AI credits remaining in your ${wallet.plan.toUpperCase()} tier allowance. Text requests use 1 credit and voice requests use 2 credits.`;
        actionResult = {
          type: "credits_info",
          balance: remaining,
          plan: wallet.plan,
          monthlyAllowance: wallet.monthlyAllowance,
        };
      }
    } else if (/subscription|plan|vip|ad-free|tier/i.test(lowerPrompt) && !/recommend|play|movie/i.test(lowerPrompt)) {
      if (!userId || !wallet) {
        replyText = `FamilyFlix offers 100% free ad-supported streaming (AVOD). We also offer FamilyFlix VIP for \$4.99/month, which includes Ad-Free playback, uncapped 1080p Full HD, offline downloading, and 2,000 monthly AI credits!`;
      } else {
        replyText = `You are currently on the ${wallet.plan.toUpperCase()} tier. VIP members enjoy zero ads, 1080p uncapped streaming, and 2,000 AI credits. Would you like to view our subscription plans?`;
        actionResult = {
          type: "navigate",
          url: "/account",
          label: "View Subscription Options",
        };
      }
    }
    // 4. CONTINUE WATCHING & RESUME PLAYBACK (Siri-Style)
    else if (/continue|resume|where i left off|last night|was watching/i.test(lowerPrompt)) {
      if (!userId) {
        replyText = `Please sign in to access your saved Continue Watching history and resume your streams seamlessly across devices.`;
      } else {
        const [latestProgress] = await db
          .select({
            progressSeconds: playbackProgress.progressSeconds,
            durationSeconds: playbackProgress.durationSeconds,
            movie: movies,
          })
          .from(playbackProgress)
          .innerJoin(movies, eq(playbackProgress.movieId, movies.id))
          .where(eq(playbackProgress.userId, userId))
          .orderBy(desc(playbackProgress.updatedAt))
          .limit(1);

        if (latestProgress && latestProgress.movie) {
          const m = latestProgress.movie;
          const mins = Math.floor(latestProgress.progressSeconds / 60);
          replyText = `I found where you left off on "${m.name}" at ${mins} minutes in. I'm ready to resume it for you right now!`;
          actionResult = {
            type: "resume_playback",
            slug: m.slug,
            name: m.name,
            posterUrl: m.posterUrl ? m.posterUrl.replace("https://yts.pw/", "https://img.yts.pw/") : null,
            progressSeconds: latestProgress.progressSeconds,
            durationSeconds: latestProgress.durationSeconds,
            url: `/watch/${m.slug}`,
          };
        } else {
          replyText = `You don't have any active playback in your Continue Watching queue yet. Would you like me to recommend a top-rated movie to start?`;
        }
      }
    }
    // 5. USER FAVORITES & SAVED LIST
    else if (/favorite|my list|saved|watchlist/i.test(lowerPrompt)) {
      if (!userId) {
        replyText = `Please sign in to view and manage your personalized Saved Watchlist.`;
      } else {
        const favs = await db
          .select({
            movie: movies,
          })
          .from(userFavorites)
          .innerJoin(movies, eq(userFavorites.movieId, movies.id))
          .where(eq(userFavorites.userId, userId))
          .limit(5);

        if (favs.length > 0) {
          const names = favs.map(f => `"${f.movie.name}"`).join(", ");
          replyText = `Here are some of the titles currently in your Saved List: ${names}. Which one would you like to watch?`;
          actionResult = {
            type: "favorites_list",
            items: favs.map(f => ({
              id: f.movie.id,
              name: f.movie.name,
              slug: f.movie.slug,
              posterUrl: f.movie.posterUrl ? f.movie.posterUrl.replace("https://yts.pw/", "https://img.yts.pw/") : null,
              url: `/watch/${f.movie.slug}`,
            })),
          };
        } else {
          replyText = `Your saved list is currently empty. Whenever you find a title you like, tap "Save to my list" or ask me to save it!`;
        }
      }
    }
    // 6. SIRI-STYLE DIRECT PLAYBACK ("Play [Title]" or "Start [Title]")
    else if (/^(play|start|watch|open)\s+/i.test(lowerPrompt)) {
      const rawTarget = prompt.replace(/^(play|start|watch|open)\s+/i, "").replace(/^(a|an|the)\s+/i, "").trim();
      const matchTitles = catalogService.searchTitles(rawTarget, 3);

      if (matchTitles.length > 0) {
        const best = matchTitles[0];
        replyText = `I found "${best.name}" (${best.year}). Let me start the stream for you!`;
        actionResult = {
          type: "play_title",
          slug: best.slug,
          name: best.name,
          posterUrl: best.posterUrl,
          backdropUrl: best.backdropUrl,
          url: `/watch/${best.slug}`,
        };
      } else {
        replyText = `I couldn't locate a title matching "${rawTarget}" in our catalog. Would you like to search by genre, or explore our top-rated recommendations?`;
      }
    }
    // 7. GENRE & CATALOG RECOMMENDATIONS ("Play a comedy", "Find horror movies", etc.)
    else if (/comedy|action|horror|drama|sci-fi|romance|thriller|documentary|animation|family/i.test(lowerPrompt)) {
      const genreMatches = ["comedy", "action", "horror", "drama", "sci-fi", "romance", "thriller", "documentary", "animation", "family"];
      const matchedGenre = genreMatches.find(g => lowerPrompt.includes(g)) || "action";
      const results = catalogService.getPublicTitles({ genre: matchedGenre, limit: 4 });

      if (results.titles.length > 0) {
        const top = results.titles[0];
        const names = results.titles.map(t => `"${t.name}" (${t.year})`).join(", ");
        replyText = `Here are some popular ${matchedGenre.toUpperCase()} titles in FamilyFlix: ${names}. Tap any card below to start playing immediately!`;
        actionResult = {
          type: "recommendations",
          genre: matchedGenre,
          items: results.titles.map(t => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            year: t.year,
            posterUrl: t.posterUrl,
            url: `/watch/${t.slug}`,
          })),
        };
      } else {
        replyText = `I couldn't find active titles under ${matchedGenre} right now. Let me know if you'd like to try another category!`;
      }
    }
    // 8. SITE INFO, TERMS, ABOUT, DEVELOPERS
    else if (/about|who made|company|mission|demuregram/i.test(lowerPrompt)) {
      replyText = `FamilyFlix By DemureGram is an autonomous, free ad-supported streaming television (AVOD) network. We provide thousands of motion pictures and television series free with ads, with optional ad-free subscriptions and developer APIs.`;
    } else if (/term|condition|policy|copyright|dmca/i.test(lowerPrompt)) {
      replyText = `FamilyFlix operates strictly under international copyright treaties and Title 17 of the United States Code. We respect content owners, maintain a public DMCA counter-notice portal, and enforce strict repeat-infringer rules.`;
    } else if (/developer|api|endpoint|key|webhook/i.test(lowerPrompt)) {
      replyText = `The FamilyFlix Developer Platform offers high-speed REST APIs (/v1/titles, /v1/categories, /v1/streaming) and webhook delivery. Developers can manage API keys and subscribe to developer tiers at /developers.`;
      actionResult = {
        type: "navigate",
        url: "/developers",
        label: "Visit Developer Portal",
      };
    }
    // 9. GENERAL SEARCH FALLBACK
    else {
      const searchMatches = catalogService.searchTitles(prompt, 3);
      if (searchMatches.length > 0) {
        const titlesList = searchMatches.map(t => `"${t.name}" (${t.year})`).join(", ");
        replyText = `I searched our catalog and found: ${titlesList}. Would you like me to start one of these?`;
        actionResult = {
          type: "search_results",
          items: searchMatches.map(t => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            year: t.year,
            posterUrl: t.posterUrl,
            url: `/watch/${t.slug}`,
          })),
        };
      } else {
        if (assistantPersona === "raven") {
          replyText = `I'm here to help you enjoy FamilyFlix! You can ask me to play a movie, find a comedy, resume your last playback, check your remaining AI credits, or answer questions about your account. What would you like to do?`;
        } else {
          replyText = `I'm standing by to assist with your streaming session. Try saying "Play a comedy", "Resume where I left off", or "How many AI credits do I have?"`;
        }
      }
    }

    // Atomic credit deduction for signed-in accounts
    let remainingCredits = wallet?.balance ?? 100;
    if (userId && wallet) {
      remainingCredits = Math.max(0, wallet.balance - cost);
      await db
        .update(aiCreditWallets)
        .set({
          balance: remainingCredits,
          totalUsed: wallet.totalUsed + cost,
          updatedAt: new Date(),
        })
        .where(eq(aiCreditWallets.userId, userId));

      await db.insert(aiCreditLedger).values({
        userId,
        type: "usage",
        amount: -cost,
        balanceAfter: remainingCredits,
        description: `${isVoice ? "Voice" : "Text"} interaction with ${assistantPersona.toUpperCase()}`,
      });
    }

    // Conversation and Message Persistence
    let convId = existingConvId;
    if (userId) {
      if (!convId) {
        const [newConv] = await db
          .insert(aiConversations)
          .values({
            userId,
            assistant: assistantPersona,
            title: prompt.slice(0, 40),
          })
          .returning();
        convId = newConv?.id;
      }

      if (convId) {
        // Save user message
        await db.insert(aiMessages).values({
          conversationId: convId,
          userId,
          role: "user",
          content: prompt,
        });

        // Save assistant response
        await db.insert(aiMessages).values({
          conversationId: convId,
          userId,
          role: "assistant",
          content: replyText,
          action: actionResult || null,
          creditsDeducted: cost,
        });
      }
    }

    response.json({
      assistant: assistantPersona,
      response: replyText,
      action: actionResult,
      creditsRemaining: remainingCredits,
      conversationId: convId,
    });
  } catch (err) {
    logger.error({ err }, "Error in AI concierge chat");
    response.status(500).json({ error: "An error occurred while processing your request." });
  }
});

// 4. POST /api/v1/ai-concierge/tts
// Natural human speech generation for RAVEN (female) and PRINCETON (male)
router.post("/tts", async (request, response): Promise<void> => {
  try {
    const { text, assistant } = request.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      response.status(400).json({ error: "Text is required for speech synthesis." });
      return;
    }

    // RAVEN = 'emma' (warm, clear American female)
    // PRINCETON = 'james' (confident, clear American male)
    const voiceKey = assistant === "princeton" ? "james" : "emma";
    const audioBuffer = await generateHumanSpeech(text.trim(), voiceKey);

    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
    response.setHeader("Content-Length", String(audioBuffer.length));
    response.end(audioBuffer);
  } catch (err) {
    logger.warn({ err }, "Speech synthesis request failed");
    response.status(500).json({ error: "Could not synthesize audio." });
  }
});

// 5. GET /api/v1/ai-concierge/conversations
// Retrieves user's private assistant conversation history
router.get("/conversations", async (request, response): Promise<void> => {
  try {
    const session = await getRequestSession(request);
    if (!session || !session.user) {
      response.status(401).json({ error: "Sign in required." });
      return;
    }

    const conversations = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, session.user.id))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(20);

    response.json(conversations);
  } catch (err) {
    logger.error({ err }, "Error fetching conversations");
    response.status(500).json({ error: "Could not load conversations." });
  }
});

// 6. DELETE /api/v1/ai-concierge/conversations/:id
// Deletes a specific conversation with strict ownership verification
router.delete("/conversations/:id", async (request, response): Promise<void> => {
  try {
    const session = await getRequestSession(request);
    if (!session || !session.user) {
      response.status(401).json({ error: "Sign in required." });
      return;
    }

    const conversationId = request.params.id;
    await db
      .delete(aiConversations)
      .where(
        and(
          eq(aiConversations.id, conversationId),
          eq(aiConversations.userId, session.user.id),
        ),
      );

    response.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Error deleting conversation");
    response.status(500).json({ error: "Could not delete conversation." });
  }
});

// 7. POST /api/v1/ai-concierge/credits/topup
// Handles credit top-up / purchase
router.post("/credits/topup", async (request, response): Promise<void> => {
  try {
    const session = await getRequestSession(request);
    if (!session || !session.user) {
      response.status(401).json({ error: "Sign in required." });
      return;
    }

    const userId = session.user.id;
    const { amount = 500, referenceId = "topup-instant" } = request.body || {};
    const creditAmount = Math.max(100, Math.min(Number(amount) || 500, 10000));

    const { wallet } = await ensureUserWalletAndPreferences(userId);
    const newBalance = (wallet?.balance ?? 0) + creditAmount;

    await db
      .update(aiCreditWallets)
      .set({
        balance: newBalance,
        updatedAt: new Date(),
      })
      .where(eq(aiCreditWallets.userId, userId));

    await db.insert(aiCreditLedger).values({
      userId,
      type: "purchase",
      amount: creditAmount,
      balanceAfter: newBalance,
      description: `Purchased ${creditAmount} AI Concierge Credits`,
      referenceId,
    });

    response.json({
      success: true,
      balance: newBalance,
      added: creditAmount,
    });
  } catch (err) {
    logger.error({ err }, "Error topping up credits");
    response.status(500).json({ error: "Could not complete credit top-up." });
  }
});

export default router;
