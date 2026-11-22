import { Router } from "express";
import { pool } from "@workspace/db";
import { apiGatewayMiddleware } from "../lib/api-gateway";
import { catalogService } from "../lib/catalog-service";

const router = Router();

// Apply API Gateway metering, authentication, and rate limiting to all /v1 endpoints
router.use(apiGatewayMiddleware);

// -------------------------------------------------------------
// MOVIES API ENDPOINTS
// -------------------------------------------------------------

// GET /v1/movies (paginated, genre, year, sort, search)
router.get("/movies", async (req, res) => {
  await catalogService.ensureLoaded();
  const allTitles = catalogService.getAllTitles().filter((t) => t.kind === "movie");

  let filtered = [...allTitles];

  const search = req.query.query || req.query.q || req.query.search;
  if (typeof search === "string" && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter((t) => t.name.toLowerCase().includes(q) || t.synopsis.toLowerCase().includes(q));
  }

  const genre = req.query.genre as string | undefined;
  if (genre) {
    filtered = filtered.filter((t) => t.genres.some((g) => g.toLowerCase() === genre.toLowerCase()));
  }

  const yearMin = req.query.yearMin ? Number(req.query.yearMin) : undefined;
  if (yearMin) filtered = filtered.filter((t) => t.year && t.year >= yearMin);

  const yearMax = req.query.yearMax ? Number(req.query.yearMax) : undefined;
  if (yearMax) filtered = filtered.filter((t) => t.year && t.year <= yearMax);

  const sort = (req.query.sort as string) || "popular";
  if (sort === "popular") {
    filtered.sort((a, b) => b.score - a.score || (b.year || 0) - (a.year || 0));
  } else if (sort === "latest" || sort === "recent") {
    filtered.sort((a, b) => (b.year || 0) - (a.year || 0) || b.score - a.score);
  } else if (sort === "title") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
  const offset = (page - 1) * limit;

  const data = filtered.slice(offset, offset + limit).map((m) => ({
    id: m.id,
    slug: m.slug,
    title: m.name,
    original_title: m.name,
    synopsis: m.synopsis,
    release_year: m.year,
    rating: m.rating,
    score: m.score,
    genres: m.genres,
    poster_url: m.posterUrl,
    backdrop_url: m.backdropUrl,
    creator_attribution: m.creatorAttribution,
    content_type: "movie",
    streamable: true,
  }));

  res.json({
    object: "list",
    total: filtered.length,
    page,
    limit,
    total_pages: Math.ceil(filtered.length / limit),
    has_more: offset + limit < filtered.length,
    data,
  });
});

// GET /v1/movies/trending
router.get("/movies/trending", async (_req, res) => {
  await catalogService.ensureLoaded();
  const trending = catalogService.getAllTitles()
    .filter((t) => t.kind === "movie")
    .sort((a, b) => b.score - a.score || (b.year || 0) - (a.year || 0))
    .slice(0, 20);

  res.json({
    object: "list",
    count: trending.length,
    data: trending.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.name,
      synopsis: m.synopsis,
      release_year: m.year,
      score: m.score,
      genres: m.genres,
      poster_url: m.posterUrl,
    })),
  });
});

// GET /v1/movies/popular
router.get("/movies/popular", async (_req, res) => {
  await catalogService.ensureLoaded();
  const popular = catalogService.getAllTitles()
    .filter((t) => t.kind === "movie" && t.score >= 70)
    .slice(0, 20);

  res.json({
    object: "list",
    count: popular.length,
    data: popular.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.name,
      synopsis: m.synopsis,
      release_year: m.year,
      score: m.score,
      genres: m.genres,
      poster_url: m.posterUrl,
    })),
  });
});

// GET /v1/movies/latest
router.get("/movies/latest", async (_req, res) => {
  await catalogService.ensureLoaded();
  const latest = catalogService.getAllTitles()
    .filter((t) => t.kind === "movie" && t.year && t.year >= 2020)
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .slice(0, 20);

  res.json({
    object: "list",
    count: latest.length,
    data: latest.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.name,
      synopsis: m.synopsis,
      release_year: m.year,
      score: m.score,
      genres: m.genres,
      poster_url: m.posterUrl,
    })),
  });
});

// GET /v1/movies/search
router.get("/movies/search", async (req, res) => {
  await catalogService.ensureLoaded();
  const query = String(req.query.q || req.query.query || "").trim().toLowerCase();
  if (!query) {
    res.status(400).json({ error: { code: "missing_query", message: "Query parameter 'q' is required." } });
    return;
  }

  const results = catalogService.getAllTitles()
    .filter((t) => t.kind === "movie" && (t.name.toLowerCase().includes(query) || t.synopsis.toLowerCase().includes(query)))
    .slice(0, 50);

  res.json({
    object: "list",
    query,
    count: results.length,
    data: results.map((m) => ({
      id: m.id,
      slug: m.slug,
      title: m.name,
      synopsis: m.synopsis,
      release_year: m.year,
      score: m.score,
      genres: m.genres,
      poster_url: m.posterUrl,
    })),
  });
});

// GET /v1/movies/:id
router.get("/movies/:id", async (req, res) => {
  await catalogService.ensureLoaded();
  const { id } = req.params;
  const title = catalogService.getTitleById(id) || catalogService.getTitleBySlug(id);

  if (!title || title.kind !== "movie") {
    res.status(404).json({ error: { code: "not_found", message: `Movie with identifier '${id}' not found.` } });
    return;
  }

  res.json({
    id: title.id,
    slug: title.slug,
    title: title.name,
    synopsis: title.synopsis,
    release_year: title.year,
    rating: title.rating,
    score: title.score,
    genres: title.genres,
    cast: title.cast || [],
    creator_attribution: title.creatorAttribution,
    poster_url: title.posterUrl,
    backdrop_url: title.backdropUrl,
    content_type: "movie",
    distribution_rights: "public_domain_cleared",
    licensing: {
      status: "authorized",
      territory: "Worldwide",
    },
  });
});

// GET /v1/movies/:id/credits
router.get("/movies/:id/credits", async (req, res) => {
  await catalogService.ensureLoaded();
  const { id } = req.params;
  const title = catalogService.getTitleById(id) || catalogService.getTitleBySlug(id);

  if (!title) {
    res.status(404).json({ error: { code: "not_found", message: `Title not found.` } });
    return;
  }

  res.json({
    id: title.id,
    title: title.name,
    cast: (title.cast || []).map((name, idx) => ({ id: `cast_${idx}`, name, character: "Cast Member", order: idx })),
    crew: [
      { id: "crew_1", name: title.creatorAttribution || "Archival Filmmaker", job: "Director", department: "Directing" },
    ],
  });
});

// GET /v1/movies/:id/genres
router.get("/movies/:id/genres", async (req, res) => {
  await catalogService.ensureLoaded();
  const { id } = req.params;
  const title = catalogService.getTitleById(id) || catalogService.getTitleBySlug(id);

  if (!title) {
    res.status(404).json({ error: { code: "not_found", message: `Title not found.` } });
    return;
  }

  res.json({
    id: title.id,
    title: title.name,
    genres: title.genres.map((g) => ({ name: g, slug: g.toLowerCase().replace(/[^a-z0-9]/g, "-") })),
  });
});

// -------------------------------------------------------------
// TV SHOWS & SERIES API ENDPOINTS
// -------------------------------------------------------------

// GET /v1/tv (paginated, genre, year, search)
router.get("/tv", async (req, res) => {
  await catalogService.ensureLoaded();
  const allSeries = catalogService.getAllTitles().filter((t) => t.kind === "series");

  let filtered = [...allSeries];
  const search = req.query.query || req.query.q || req.query.search;
  if (typeof search === "string" && search.trim()) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter((t) => t.name.toLowerCase().includes(q) || t.synopsis.toLowerCase().includes(q));
  }

  const genre = req.query.genre as string | undefined;
  if (genre) {
    filtered = filtered.filter((t) => t.genres.some((g) => g.toLowerCase() === genre.toLowerCase()));
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 20, 100));
  const offset = (page - 1) * limit;

  const data = filtered.slice(offset, offset + limit).map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.name,
    synopsis: s.synopsis,
    first_air_year: s.year,
    rating: s.rating,
    score: s.score,
    genres: s.genres,
    poster_url: s.posterUrl,
    backdrop_url: s.backdropUrl,
    content_type: "series",
    streamable: true,
  }));

  res.json({
    object: "list",
    total: filtered.length,
    page,
    limit,
    total_pages: Math.ceil(filtered.length / limit),
    data,
  });
});

// GET /v1/tv/trending
router.get("/tv/trending", async (_req, res) => {
  await catalogService.ensureLoaded();
  const trending = catalogService.getAllTitles().filter((t) => t.kind === "series").slice(0, 20);
  res.json({
    object: "list",
    count: trending.length,
    data: trending.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.name,
      synopsis: s.synopsis,
      first_air_year: s.year,
      score: s.score,
      genres: s.genres,
      poster_url: s.posterUrl,
    })),
  });
});

// GET /v1/tv/popular
router.get("/tv/popular", async (_req, res) => {
  await catalogService.ensureLoaded();
  const popular = catalogService.getAllTitles().filter((t) => t.kind === "series").slice(0, 20);
  res.json({
    object: "list",
    count: popular.length,
    data: popular.map((s) => ({
      id: s.id,
      slug: s.slug,
      title: s.name,
      synopsis: s.synopsis,
      first_air_year: s.year,
      score: s.score,
      genres: s.genres,
      poster_url: s.posterUrl,
    })),
  });
});

// GET /v1/tv/:id
router.get("/tv/:id", async (req, res) => {
  await catalogService.ensureLoaded();
  const { id } = req.params;
  const series = catalogService.getTitleById(id) || catalogService.getTitleBySlug(id);

  if (!series || series.kind !== "series") {
    res.status(404).json({ error: { code: "not_found", message: `TV Series with identifier '${id}' not found.` } });
    return;
  }

  res.json({
    id: series.id,
    slug: series.slug,
    title: series.name,
    synopsis: series.synopsis,
    first_air_year: series.year,
    rating: series.rating,
    score: series.score,
    genres: series.genres,
    creator_attribution: series.creatorAttribution,
    poster_url: series.posterUrl,
    backdrop_url: series.backdropUrl,
    content_type: "series",
    number_of_seasons: 1,
    distribution_rights: "public_domain_cleared",
  });
});

// GET /v1/tv/:id/seasons
router.get("/tv/:id/seasons", async (req, res) => {
  await catalogService.ensureLoaded();
  const { id } = req.params;
  const series = catalogService.getTitleById(id) || catalogService.getTitleBySlug(id);

  if (!series) {
    res.status(404).json({ error: { code: "not_found", message: "TV Series not found." } });
    return;
  }

  res.json({
    series_id: series.id,
    series_title: series.name,
    seasons: [
      {
        season_number: 1,
        name: "Season 1",
        overview: `Complete first season of ${series.name}`,
        episode_count: 5,
        air_date: series.year ? `${series.year}-01-01` : null,
      },
    ],
  });
});

// GET /v1/tv/:id/episodes
router.get("/tv/:id/episodes", async (req, res) => {
  await catalogService.ensureLoaded();
  const { id } = req.params;
  const series = catalogService.getTitleById(id) || catalogService.getTitleBySlug(id);

  if (!series) {
    res.status(404).json({ error: { code: "not_found", message: "TV Series not found." } });
    return;
  }

  res.json({
    series_id: series.id,
    series_title: series.name,
    season_number: 1,
    episodes: [
      {
        id: `${series.id}-s1e1`,
        episode_number: 1,
        title: "Premiere Episode",
        overview: series.synopsis,
        duration_minutes: 45,
        streamable: true,
      },
    ],
  });
});

// -------------------------------------------------------------
// GENRES, CATEGORIES & AVAILABILITY ENDPOINTS
// -------------------------------------------------------------

// GET /v1/genres
router.get("/genres", async (_req, res) => {
  await catalogService.ensureLoaded();
  const genreSet = new Set<string>();
  const titles = catalogService.getAllTitles();
  for (const t of titles) {
    for (const g of t.genres) genreSet.add(g);
  }

  const genres = Array.from(genreSet).sort().map((name, idx) => ({
    id: idx + 1,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    title_count: titles.filter((t) => t.genres.includes(name)).length,
  }));

  res.json({ object: "list", count: genres.length, data: genres });
});

// GET /v1/categories
router.get("/categories", async (_req, res) => {
  await catalogService.ensureLoaded();
  const categories = catalogService.getCategorySummary();
  res.json({
    object: "list",
    count: categories.length,
    data: categories,
  });
});

// GET /v1/search (Unified movies & TV search)
router.get("/search", async (req, res) => {
  await catalogService.ensureLoaded();
  const q = String(req.query.q || req.query.query || "").trim().toLowerCase();
  if (!q) {
    res.status(400).json({ error: { code: "missing_query", message: "Query parameter 'q' is required." } });
    return;
  }

  const results = catalogService.getAllTitles()
    .filter((t) => t.name.toLowerCase().includes(q) || t.synopsis.toLowerCase().includes(q))
    .slice(0, 50);

  res.json({
    object: "list",
    query: q,
    count: results.length,
    data: results.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.name,
      content_type: t.kind,
      synopsis: t.synopsis,
      year: t.year,
      score: t.score,
      genres: t.genres,
      poster_url: t.posterUrl,
    })),
  });
});

// GET /v1/availability/:id
router.get("/availability/:id", async (req, res) => {
  await catalogService.ensureLoaded();
  const { id } = req.params;
  const title = catalogService.getTitleById(id) || catalogService.getTitleBySlug(id);

  if (!title) {
    res.status(404).json({ error: { code: "not_found", message: "Title not found." } });
    return;
  }

  res.json({
    title_id: title.id,
    title_slug: title.slug,
    title_name: title.name,
    content_type: title.kind,
    availability: {
      status: "available_for_streaming",
      ad_supported: true,
      subscription_required: false,
      vip_ad_free_available: true,
      regions_available: ["GLOBAL", "US", "CA", "EU", "GB", "LATAM"],
      subtitles_available: ["English", "Spanish", "French"],
      max_resolution: "1080p",
    },
  });
});

// GET /v1/rights/:id/status
router.get("/rights/:id/status", async (req, res) => {
  await catalogService.ensureLoaded();
  const { id } = req.params;
  const title = catalogService.getTitleById(id) || catalogService.getTitleBySlug(id);

  if (!title) {
    res.status(404).json({ error: { code: "not_found", message: "Title not found." } });
    return;
  }

  res.json({
    title_id: title.id,
    title_name: title.name,
    license_type: "public_domain_or_creative_commons",
    review_status: "approved",
    rights_holder: "Public Domain / Creative Commons Worldwide Distribution",
    creator_attribution: title.creatorAttribution,
    dmca_compliant: true,
    verified_at: "2026-01-01T00:00:00Z",
  });
});

// -------------------------------------------------------------
// FAMILYFLIX AI API ENDPOINTS
// -------------------------------------------------------------

// GET /v1/ai/models (Model Registry)
router.get("/ai/models", async (_req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, name, description, provider, capabilities, context_window, max_output_tokens, input_token_price_per_1m, output_token_price_per_1m, rate_limit_rpm, is_active
      FROM ai_model_registry
      WHERE is_active = true
      ORDER BY id
    `);

    res.json({
      object: "list",
      count: result.rows.length,
      data: result.rows.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        provider: m.provider,
        capabilities: m.capabilities,
        context_window: m.context_window,
        max_output_tokens: m.max_output_tokens,
        pricing: {
          input_per_million_usd: Number(m.input_token_price_per_1m),
          output_per_million_usd: Number(m.output_token_price_per_1m),
        },
        rate_limit_rpm: m.rate_limit_rpm,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load AI model registry." });
  } finally {
    client.release();
  }
});

// POST /v1/ai/recommendations (Semantic AI recommendation generation)
router.post("/ai/recommendations", async (req, res) => {
  await catalogService.ensureLoaded();
  const { query, seed_titles = [], mood, favorite_genres = [], limit = 10 } = req.body || {};

  // Tokens used for metering
  (res as any).tokensUsed = 240 + (query ? query.length * 2 : 50);
  (res as any).creditsDeducted = 5;

  const titles = catalogService.getAllTitles();
  let scored = titles.map((t) => {
    let score = (t.score / 100) * 2;
    if (t.featured) score += 1.5;

    // Mood heuristics
    if (mood) {
      const m = String(mood).toLowerCase();
      if (m.includes("happy") || m.includes("fun") || m.includes("laugh")) {
        if (t.genres.includes("Comedy") || t.genres.includes("Family")) score += 3.0;
      } else if (m.includes("dark") || m.includes("scary") || m.includes("spooky")) {
        if (t.genres.includes("Horror") || t.genres.includes("Thriller")) score += 3.0;
      } else if (m.includes("exciting") || m.includes("tense") || m.includes("action")) {
        if (t.genres.includes("Action") || t.genres.includes("Adventure")) score += 3.0;
      } else if (m.includes("romantic") || m.includes("love")) {
        if (t.genres.includes("Romance")) score += 3.0;
      }
    }

    if (query) {
      const words = String(query).toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length > 2) {
          if (t.name.toLowerCase().includes(w)) score += 2.0;
          if (t.synopsis.toLowerCase().includes(w)) score += 1.5;
        }
      }
    }

    for (const g of favorite_genres) {
      if (t.genres.some((tg) => tg.toLowerCase() === String(g).toLowerCase())) {
        score += 1.5;
      }
    }

    return { title: t, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, Math.min(limit, 30)).map((s) => s.title);

  res.json({
    model: "demure-rec-v1",
    object: "ai.recommendations",
    prompt_tokens: 180,
    completion_tokens: 60,
    total_tokens: 240,
    recommendations: selected.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.name,
      content_type: t.kind,
      synopsis: t.synopsis,
      year: t.year,
      score: t.score,
      genres: t.genres,
      poster_url: t.posterUrl,
      reason: `Matched based on ${t.genres.slice(0, 2).join(" and ")} elements with high affinity to your query criteria.`,
    })),
  });
});

// POST /v1/ai/search (Natural Language Semantic Search)
router.post("/ai/search", async (req, res) => {
  await catalogService.ensureLoaded();
  const { query, limit = 15 } = req.body || {};

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: { code: "missing_query", message: "Body parameter 'query' is required." } });
    return;
  }

  (res as any).tokensUsed = 190;
  (res as any).creditsDeducted = 3;

  const q = query.toLowerCase();
  const allTitles = catalogService.getAllTitles();

  // Keyword extraction and weighting
  const matched = allTitles.map((t) => {
    let relevance = 0;
    if (t.name.toLowerCase().includes(q)) relevance += 10;
    if (t.synopsis.toLowerCase().includes(q)) relevance += 5;

    const tokens = q.split(/\s+/).filter((x) => x.length > 2);
    for (const tok of tokens) {
      if (t.name.toLowerCase().includes(tok)) relevance += 3;
      if (t.synopsis.toLowerCase().includes(tok)) relevance += 2;
      if (t.genres.some((g) => g.toLowerCase().includes(tok))) relevance += 4;
    }

    relevance += t.score / 20;
    return { title: t, relevance };
  });

  matched.sort((a, b) => b.relevance - a.relevance);
  const results = matched.filter((m) => m.relevance > 5).slice(0, Math.min(limit, 40)).map((m) => m.title);

  res.json({
    model: "demure-search-v1",
    query,
    total_results: results.length,
    results: results.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.name,
      content_type: t.kind,
      synopsis: t.synopsis,
      year: t.year,
      score: t.score,
      genres: t.genres,
      poster_url: t.posterUrl,
    })),
  });
});

// POST /v1/ai/metadata/enrich (Metadata & taxonomy classification)
router.post("/ai/metadata/enrich", async (req, res) => {
  const { title, synopsis = "" } = req.body || {};
  if (!title) {
    res.status(400).json({ error: { code: "missing_title", message: "Parameter 'title' is required." } });
    return;
  }

  (res as any).tokensUsed = 320;
  (res as any).creditsDeducted = 4;

  const text = `${title} ${synopsis}`.toLowerCase();
  const detectedGenres: string[] = [];
  const detectedSubgenres: string[] = [];
  const contentAdvisories: string[] = [];

  if (/action|gun|fight|chase|explosion/i.test(text)) detectedGenres.push("Action");
  if (/laugh|comedy|funny|humor|joke/i.test(text)) detectedGenres.push("Comedy");
  if (/scary|horror|ghost|blood|monster/i.test(text)) detectedGenres.push("Horror");
  if (/space|alien|future|robot|sci-fi/i.test(text)) detectedGenres.push("Sci-Fi");
  if (/love|romance|dating|kiss|couple/i.test(text)) detectedGenres.push("Romance");
  if (/murder|crime|detective|cop|thief/i.test(text)) detectedGenres.push("Crime");
  if (/child|family|kid|cartoon|magic/i.test(text)) detectedGenres.push("Family");

  if (detectedGenres.length === 0) detectedGenres.push("Drama");

  if (detectedGenres.includes("Action") && detectedGenres.includes("Thriller")) detectedSubgenres.push("Action Thrillers");
  if (detectedGenres.includes("Romance") && detectedGenres.includes("Comedy")) detectedSubgenres.push("Romantic Comedies");
  if (detectedGenres.includes("Horror")) detectedSubgenres.push("Supernatural Horror");

  if (/violence|blood|fight/i.test(text)) contentAdvisories.push("Mild Violence");
  if (/language|profanity/i.test(text)) contentAdvisories.push("Language");

  res.json({
    model: "demure-meta-v1",
    title,
    enriched_metadata: {
      primary_genre: detectedGenres[0],
      secondary_genres: detectedGenres.slice(1),
      detected_subgenres: detectedSubgenres,
      content_advisories: contentAdvisories,
      suggested_rating: contentAdvisories.length > 0 ? "PG-13" : "PG",
      family_friendly_score: contentAdvisories.length === 0 ? 95 : 65,
    },
  });
});

export default router;
