import { Router } from "express";
import { catalogService } from "../lib/catalog-service";

const router = Router();

// 1. All 44 Main Categories Summary with live title counts
router.get("/v1/categories", async (_req, res) => {
  await catalogService.ensureLoaded();
  const categories = catalogService.getCategorySummary();
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({
    total: categories.length,
    categories,
  });
});

// 2. All 20 Subgenres Summary
router.get("/v1/subgenres", async (_req, res) => {
  await catalogService.ensureLoaded();
  const subgenres = catalogService.getSubgenreSummary();
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({
    total: subgenres.length,
    subgenres,
  });
});

// 3. Dynamic Category Browsing (Movies, TV Shows, Subgenres, Year Range, Sorting)
router.get("/v1/categories/:slug", async (req, res) => {
  await catalogService.ensureLoaded();
  const { slug } = req.params;
  const contentType = (req.query.contentType as "all" | "movies" | "series") || "all";
  const subgenre = req.query.subgenre as string | undefined;
  const yearMin = req.query.yearMin ? Number(req.query.yearMin) : undefined;
  const yearMax = req.query.yearMax ? Number(req.query.yearMax) : undefined;
  const sort = (req.query.sort as "popular" | "recent" | "score" | "title") || "popular";
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 40;

  const result = catalogService.getCategoryTitles(slug, {
    contentType,
    subgenre,
    yearMin,
    yearMax,
    sort,
    page,
    limit,
  });

  if (!result.category) {
    res.status(404).json({ error: `Category '${slug}' not found.` });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json(result);
});

// 4. Homepage Curated Content Rows (All 22 Collections)
router.get("/v1/home/curated-rows", async (_req, res) => {
  await catalogService.ensureLoaded();
  const rows = catalogService.getCuratedRows();
  const collections = Object.entries(rows).map(([id, val]) => ({
    id,
    title: val.title,
    subtitle: val.subtitle,
    slug: val.slug,
    items: val.items,
  }));
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json(collections);
});

// 5. Featured Hero Carousel (5-8 items with high-res backdrops)
router.get("/v1/home/featured-hero", async (_req, res) => {
  await catalogService.ensureLoaded();
  const heroTitles = catalogService.getFeaturedHeroTitles();
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json(heroTitles);
});

// 6. Returning-User Personalized Recommendations with Repeat Suppression
router.post("/v1/home/personalized", async (req, res) => {
  await catalogService.ensureLoaded();
  const {
    history = [],
    historySlugs = [],
    favoriteSlugs = [],
    likedSlugs = [],
    dislikedSlugs = [],
    preferredGenres = [],
    favoriteGenres = [],
    seen = [],
    limit = 20,
  } = req.body || {};

  const result = catalogService.getPersonalizedRecommendations({
    historySlugs: historySlugs.length > 0 ? historySlugs : history,
    favoriteSlugs,
    likedSlugs,
    dislikedSlugs: [...dislikedSlugs, ...seen],
    favoriteGenres: favoriteGenres.length > 0 ? favoriteGenres : preferredGenres,
    limit,
  });

  res.json(result.recommended || []);
});

export default router;
