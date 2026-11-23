import { pool } from "@workspace/db";
import { CATEGORIES_DEFINITIONS, SUBGENRES_DEFINITIONS, type CatalogTitleData, type CategoryDefinition } from "./categories";
import { logger } from "./logger";

class CatalogService {
  private titles: CatalogTitleData[] = [];
  private titlesById: Map<string, CatalogTitleData> = new Map();
  private titlesBySlug: Map<string, CatalogTitleData> = new Map();
  private categoryCounts: Map<string, { total: number; movies: number; series: number }> = new Map();
  private subgenreCounts: Map<string, number> = new Map();
  private isLoaded = false;
  private loadPromise: Promise<void> | null = null;
  private lastLoadedAt = 0;

  constructor() {
    // Initial lazy load trigger
  }

  public async ensureLoaded(): Promise<void> {
    const now = Date.now();
    // Cache for 5 minutes
    if (this.isLoaded && now - this.lastLoadedAt < 300000) {
      return;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this.refreshCatalog();
    await this.loadPromise;
    this.loadPromise = null;
  }

  public async refreshCatalog(): Promise<void> {
    const startTime = Date.now();
    const client = await pool.connect();

    try {

      // Query only published titles with active/approved media rights or playback sources
      const query = `
        SELECT
          m.id,
          m.slug,
          m.name,
          m.kind,
          m.synopsis,
          m.year,
          m.rating,
          m.score,
          m.poster_url as "posterUrl",
          m.backdrop_url as "backdropUrl",
          m.creator_attribution as "creatorAttribution",
          m.featured,
          COALESCE(array_agg(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL), '{}') as genres,
          COALESCE(array_agg(DISTINCT c.value) FILTER (WHERE c.value IS NOT NULL), '{}') as cast
        FROM movies m
        LEFT JOIN (
          SELECT ims.movie_id, MAX(t.seeders) as max_seeders
          FROM imported_movie_sources ims
          JOIN imported_torrent_sources t ON t.movie_source_id = ims.id
          WHERE t.playback_status = 'active' AND t.rights_status = 'approved'
          GROUP BY ims.movie_id
        ) ts ON ts.movie_id = m.id
        LEFT JOIN movie_genres mg ON m.id = mg.movie_id
        LEFT JOIN genres g ON mg.genre_id = g.id
        LEFT JOIN LATERAL jsonb_array_elements_text(m.cast) c(value) ON true
        WHERE m.status = 'published'
        GROUP BY m.id, m.slug, m.name, m.kind, m.synopsis, m.year, m.rating, m.score, m.poster_url, m.backdrop_url, m.creator_attribution, m.featured, ts.max_seeders
        ORDER BY m.featured DESC, COALESCE(ts.max_seeders, 0) DESC, m.published_at DESC NULLS LAST, m.created_at DESC
      `;

      const result = await client.query(query);

      const loadedTitles: CatalogTitleData[] = result.rows.map((r) => {
        const rawPoster = r.posterUrl;
        const posterUrl = rawPoster ? rawPoster.replace("https://yts.pw/", "https://img.yts.pw/") : null;
        const rawBackdrop = r.backdropUrl;
        const backdropUrl = rawBackdrop ? rawBackdrop.replace("https://yts.pw/", "https://img.yts.pw/") : posterUrl;
        return {
          id: r.id,
          slug: r.slug,
          name: r.name,
          kind: r.kind,
          synopsis: r.synopsis || "",
          year: r.year,
          rating: r.rating,
          score: Number(r.score) || 0,
          genres: Array.isArray(r.genres) ? r.genres : [],
          cast: Array.isArray(r.cast) ? r.cast : [],
          creatorAttribution: r.creatorAttribution,
          posterUrl,
          backdropUrl,
          featured: Boolean(r.featured),
        };
      });

      this.titles = loadedTitles;
      this.titlesById.clear();
      this.titlesBySlug.clear();
      this.categoryCounts.clear();
      this.subgenreCounts.clear();

      for (const t of loadedTitles) {
        this.titlesById.set(t.id, t);
        this.titlesBySlug.set(t.slug, t);
      }

      // Precalculate counts for all 44 categories
      for (const cat of CATEGORIES_DEFINITIONS) {
        let moviesCount = 0;
        let seriesCount = 0;
        for (const t of loadedTitles) {
          if (cat.match(t)) {
            if (t.kind === "movie") moviesCount++;
            else if (t.kind === "series") seriesCount++;
          }
        }
        this.categoryCounts.set(cat.slug, {
          total: moviesCount + seriesCount,
          movies: moviesCount,
          series: seriesCount,
        });
      }

      // Precalculate counts for all 20 subgenres
      for (const sub of SUBGENRES_DEFINITIONS) {
        let count = 0;
        for (const t of loadedTitles) {
          if (sub.match(t)) count++;
        }
        this.subgenreCounts.set(sub.slug, count);
      }

      this.isLoaded = true;
      this.lastLoadedAt = Date.now();
      logger.info(
        { count: this.titles.length, elapsedMs: Date.now() - startTime },
        "FamilyFlix catalog loaded and cached successfully",
      );
    } catch (err) {
      logger.error({ err }, "Error refreshing catalog in CatalogService");
    } finally {
      client.release();
    }
  }

  public getAllTitles(): CatalogTitleData[] {
    return this.titles;
  }

  public getTitleById(id: string): CatalogTitleData | undefined {
    return this.titlesById.get(id);
  }

  public getTitleBySlug(slug: string): CatalogTitleData | undefined {
    return this.titlesBySlug.get(slug);
  }

  public searchTitles(query: string, limit = 5): CatalogTitleData[] {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();

    const scored: { title: CatalogTitleData; score: number }[] = [];
    for (const title of this.titles) {
      const name = title.name.toLowerCase();
      const slug = title.slug.toLowerCase();
      let matchScore = 0;

      if (name === q || slug === q) {
        matchScore = 100;
      } else if (name.startsWith(q)) {
        matchScore = 80;
      } else if (name.includes(q)) {
        matchScore = 60;
      } else if (slug.includes(q)) {
        matchScore = 50;
      } else if (title.synopsis && title.synopsis.toLowerCase().includes(q)) {
        matchScore = 30;
      } else if (title.genres && title.genres.some((g) => g.toLowerCase().includes(q))) {
        matchScore = 20;
      }

      if (matchScore > 0) {
        matchScore += (title.score / 100) * 5;
        if (title.featured) matchScore += 2;
        scored.push({ title, score: matchScore });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.title);
  }

  public getCategorySummary(): Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    contentType: "movies" | "series" | "both";
    icon: string;
    subgenres: string[];
    counts: { total: number; movies: number; series: number };
  }> {
    return CATEGORIES_DEFINITIONS.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      contentType: cat.contentType,
      icon: cat.icon,
      subgenres: cat.subgenres,
      counts: this.categoryCounts.get(cat.slug) || { total: 0, movies: 0, series: 0 },
    }));
  }

  public getSubgenreSummary(): Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    count: number;
  }> {
    return SUBGENRES_DEFINITIONS.map((sub) => ({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      description: sub.description,
      count: this.subgenreCounts.get(sub.slug) || 0,
    }));
  }

  public getCategoryTitles(
    slug: string,
    options: {
      contentType?: "all" | "movies" | "series";
      subgenre?: string;
      yearMin?: number;
      yearMax?: number;
      sort?: "popular" | "recent" | "score" | "title";
      page?: number;
      limit?: number;
    } = {},
  ): {
    category: CategoryDefinition | undefined;
    total: number;
    moviesCount: number;
    seriesCount: number;
    page: number;
    limit: number;
    items: CatalogTitleData[];
  } {
    const category = CATEGORIES_DEFINITIONS.find((c) => c.slug === slug);
    if (!category) {
      return {
        category: undefined,
        total: 0,
        moviesCount: 0,
        seriesCount: 0,
        page: options.page || 1,
        limit: options.limit || 40,
        items: [],
      };
    }

    let matched = this.titles.filter(category.match);

    const moviesCount = matched.filter((t) => t.kind === "movie").length;
    const seriesCount = matched.filter((t) => t.kind === "series").length;

    // Filter by contentType
    if (options.contentType === "movies") {
      matched = matched.filter((t) => t.kind === "movie");
    } else if (options.contentType === "series") {
      matched = matched.filter((t) => t.kind === "series");
    }

    // Filter by subgenre if provided
    if (options.subgenre) {
      const sub = SUBGENRES_DEFINITIONS.find((s) => s.slug === options.subgenre);
      if (sub) {
        matched = matched.filter(sub.match);
      }
    }

    // Filter by Year Range
    if (options.yearMin !== undefined) {
      matched = matched.filter((t) => t.year && t.year >= options.yearMin!);
    }
    if (options.yearMax !== undefined) {
      matched = matched.filter((t) => t.year && t.year <= options.yearMax!);
    }

    // Sort
    const sort = options.sort || "popular";
    if (sort === "popular") {
      matched.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.score - a.score || (b.year || 0) - (a.year || 0));
    } else if (sort === "recent") {
      matched.sort((a, b) => (b.year || 0) - (a.year || 0) || b.score - a.score);
    } else if (sort === "score") {
      matched.sort((a, b) => b.score - a.score || (b.year || 0) - (a.year || 0));
    } else if (sort === "title") {
      matched.sort((a, b) => a.name.localeCompare(b.name));
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(options.limit || 40, 100));
    const offset = (page - 1) * limit;
    const pagedItems = matched.slice(offset, offset + limit);

    return {
      category,
      total: matched.length,
      moviesCount,
      seriesCount,
      page,
      limit,
      items: pagedItems,
    };
  }

  // -------------------------------------------------------------
  // HOMEPAGE CURATED ROWS (All 22 requested collections)
  // -------------------------------------------------------------
  public getCuratedRows(): Record<string, { title: string; subtitle?: string; slug?: string; items: CatalogTitleData[] }> {
    const movies = this.titles.filter((t) => t.kind === "movie");
    const series = this.titles.filter((t) => t.kind === "series");

    return {
      "trending-movies": {
        title: "Trending Movies",
        subtitle: "Most watched by FamilyFlix viewers this week",
        slug: "trending-movies",
        items: [...movies].sort((a, b) => b.score - a.score || (b.year || 0) - (a.year || 0)).slice(0, 20),
      },
      "trending-tv": {
        title: "Trending TV Shows",
        subtitle: "Popular public domain & classic television series",
        slug: "trending-tv",
        items: [...series].sort((a, b) => (b.year || 0) - (a.year || 0)).slice(0, 20),
      },
      "popular-movies": {
        title: "Popular Movies",
        subtitle: "Audience favorites and celebrated crowd-pleasers",
        slug: "popular-movies",
        items: [...movies].filter((t) => t.score >= 70).slice(0, 20),
      },
      "popular-tv": {
        title: "Popular TV Shows",
        subtitle: "Top-rated multi-episode drama, comedy, and crime",
        slug: "popular-tv",
        items: [...series].slice(0, 20),
      },
      "recently-added-movies": {
        title: "Recently Added Movies",
        subtitle: "Freshly restored titles ready for streaming",
        slug: "recently-added-movies",
        items: [...movies].slice(0, 20),
      },
      "recently-added-tv": {
        title: "Recently Added TV Shows",
        subtitle: "Latest complete seasons and episodic series",
        slug: "recently-added-tv",
        items: [...series].slice(0, 20),
      },
      "new-releases": {
        title: "New Releases",
        subtitle: "Modern public domain and creative commons releases (2020–2026)",
        slug: "new-releases",
        items: this.titles.filter((t) => t.year && t.year >= 2020).slice(0, 20),
      },
      "classic-movies": {
        title: "Classic Movies",
        subtitle: "Golden age Hollywood and silver screen masterpieces",
        slug: "classics",
        items: movies.filter((t) => t.year && t.year <= 1975).slice(0, 20),
      },
      "popular-series": {
        title: "Popular Series",
        subtitle: "Binge-worthy sagas across crime, reality, and family",
        slug: "popular-series",
        items: series.slice(0, 20),
      },
      "family-favorites": {
        title: "Family Favorites",
        subtitle: "Wholesome animation, animal tales, and feel-good adventures",
        slug: "family-movies",
        items: this.titles.filter((t) => t.genres.includes("Family") || t.genres.includes("Animation")).slice(0, 20),
      },
      "award-winning": {
        title: "Award-Winning Movies",
        subtitle: "Critically acclaimed cinema scoring 80% or higher",
        slug: "arthouse-films",
        items: movies.filter((t) => t.score >= 75).slice(0, 20),
      },
      "top-documentaries": {
        title: "Top Documentaries",
        subtitle: "Wildlife, true history, and inspiring true stories",
        slug: "documentary",
        items: this.titles.filter((t) => t.genres.includes("Documentary")).slice(0, 20),
      },
      "popular-anime": {
        title: "Popular Anime",
        subtitle: "Japanese animation, fantasy quests, and stylized action",
        slug: "anime",
        items: this.titles.filter((t) => t.genres.includes("Animation") && /anime|manga|japan|tokyo|mecha|ninja|samurai/i.test(t.name + " " + t.synopsis)).slice(0, 20),
      },
      "horror-favorites": {
        title: "Horror Favorites",
        subtitle: "Creepy creatures, classic haunted houses, and slashers",
        slug: "horror",
        items: this.titles.filter((t) => t.genres.includes("Horror")).slice(0, 20),
      },
      "action-adventure": {
        title: "Action & Adventure",
        subtitle: "Explosive showdowns, treasure hunts, and high-stakes missions",
        slug: "action",
        items: this.titles.filter((t) => t.genres.includes("Action") || t.genres.includes("Adventure")).slice(0, 20),
      },
      "comedy-favorites": {
        title: "Comedy Favorites",
        subtitle: "Non-stop laughs, screwball misadventures, and comedy specials",
        slug: "comedy",
        items: this.titles.filter((t) => t.genres.includes("Comedy")).slice(0, 20),
      },
      "romance-favorites": {
        title: "Romance Favorites",
        subtitle: "Timeless love stories, passionate pairings, and meet-cutes",
        slug: "romance",
        items: this.titles.filter((t) => t.genres.includes("Romance")).slice(0, 20),
      },
      "sci-fi-fantasy": {
        title: "Sci-Fi & Fantasy",
        subtitle: "Cosmic voyages, distant galaxies, and mythical realms",
        slug: "sci-fi-fantasy",
        items: this.titles.filter((t) => t.genres.includes("Sci-Fi") || t.genres.includes("Fantasy")).slice(0, 20),
      },
      "crime-mystery": {
        title: "Crime & Mystery",
        subtitle: "Hardboiled detectives, bank capers, and whodunits",
        slug: "mystery",
        items: this.titles.filter((t) => t.genres.includes("Crime") || t.genres.includes("Mystery")).slice(0, 20),
      },
      "hidden-gems": {
        title: "Hidden Gems",
        subtitle: "Overlooked cult favorites and unforgettable indie finds",
        slug: "indie-films",
        items: this.titles.filter((t) => t.score >= 65 && !t.featured).slice(0, 20),
      },
      "top-rated-movies": {
        title: "Top-Rated Movies",
        subtitle: "Highest rated films in the catalog",
        slug: "top-rated-movies",
        items: [...movies].sort((a, b) => b.score - a.score).slice(0, 20),
      },
      "top-rated-tv": {
        title: "Top-Rated TV Shows",
        subtitle: "Top-rated multi-episode drama and crime series",
        slug: "top-rated-tv",
        items: [...series].sort((a, b) => b.score - a.score).slice(0, 20),
      },
    };
  }

  // -------------------------------------------------------------
  // FEATURED HERO CAROUSEL (5-8 high impact items)
  // -------------------------------------------------------------
  public getFeaturedHeroTitles(): CatalogTitleData[] {
    const featured = this.titles.filter((t) => t.featured && t.backdropUrl);
    if (featured.length >= 6) {
      return featured.slice(0, 8);
    }
    // Supplement with high-score, rich-backdrop titles
    const highScores = this.titles
      .filter((t) => !t.featured && t.backdropUrl && t.score >= 70 && t.synopsis.length > 50)
      .slice(0, 8 - featured.length);
    return [...featured, ...highScores];
  }

  // -------------------------------------------------------------
  // PERSONALIZED RECOMMENDATIONS WITH REPEAT SUPPRESSION
  // -------------------------------------------------------------
  public getPersonalizedRecommendations(options: {
    historySlugs?: string[];
    favoriteSlugs?: string[];
    likedSlugs?: string[];
    dislikedSlugs?: string[];
    favoriteGenres?: string[];
    limit?: number;
  }): { recommended: CatalogTitleData[]; becauseYouWatched?: { title: CatalogTitleData; recommendations: CatalogTitleData[] } } {
    const limit = options.limit || 20;
    const dislikedSet = new Set(options.dislikedSlugs || []);
    const historySet = new Set(options.historySlugs || []);
    const likedSet = new Set(options.likedSlugs || []);
    const favSet = new Set(options.favoriteSlugs || []);

    // 1. Gather preferred genres
    const genreScores = new Map<string, number>();
    for (const g of options.favoriteGenres || []) {
      genreScores.set(g, (genreScores.get(g) || 0) + 3);
    }
    for (const slug of [...favSet, ...likedSet]) {
      const t = this.titlesBySlug.get(slug);
      if (t) {
        for (const g of t.genres) {
          genreScores.set(g, (genreScores.get(g) || 0) + 2);
        }
      }
    }
    for (const slug of historySet) {
      const t = this.titlesBySlug.get(slug);
      if (t) {
        for (const g of t.genres) {
          genreScores.set(g, (genreScores.get(g) || 0) + 1);
        }
      }
    }

    // 2. Score candidate titles with repeat suppression
    const candidates = this.titles.filter((t) => !dislikedSet.has(t.slug));

    const scored = candidates.map((t) => {
      let weight = 0;
      // Genre affinity
      for (const g of t.genres) {
        weight += (genreScores.get(g) || 0) * 1.5;
      }
      // Rating score baseline
      weight += (t.score / 100) * 2;
      // Boost featured/recent
      if (t.featured) weight += 1.5;
      if (t.year && t.year >= 2020) weight += 1.0;

      // Repeat suppression: Penalize titles already watched completely
      if (historySet.has(t.slug)) {
        weight -= 3.0; // Pushed down so user discovers new posters
      }

      return { title: t, weight };
    });

    scored.sort((a, b) => b.weight - a.weight);
    const recommended = scored.slice(0, limit).map((s) => s.title);

    // "Because You Watched" - based on most recently watched title
    let becauseYouWatched: { title: CatalogTitleData; recommendations: CatalogTitleData[] } | undefined;
    if (options.historySlugs && options.historySlugs.length > 0) {
      const seedSlug = options.historySlugs[0];
      const seedTitle = this.titlesBySlug.get(seedSlug);
      if (seedTitle) {
        const similar = this.titles
          .filter((t) => t.slug !== seedSlug && !historySet.has(t.slug) && t.genres.some((g) => seedTitle.genres.includes(g)))
          .sort((a, b) => b.score - a.score)
          .slice(0, 15);
        if (similar.length > 0) {
          becauseYouWatched = { title: seedTitle, recommendations: similar };
        }
      }
    }

    return { recommended, becauseYouWatched };
  }

  // -------------------------------------------------------------
  // PUBLIC TITLES QUERY (Blazing fast in-memory query, <1ms)
  // -------------------------------------------------------------
  public getPublicTitles(options: {
    query?: string;
    kind?: "movie" | "series" | "live";
    genre?: string;
    offset?: number;
    limit?: number;
  }): {
    titles: Array<{
      id: string;
      slug: string;
      name: string;
      kind: "movie" | "series" | "live";
      synopsis: string;
      year: number;
      genres: string[];
      creatorAttribution: string;
      posterUrl: string | null;
      featured: boolean;
    }>;
    total: number;
  } {
    let matched = this.titles;

    if (options.kind) {
      matched = matched.filter((t) => t.kind === options.kind);
    }

    if (options.genre && options.genre.trim()) {
      const g = options.genre.toLowerCase().trim();
      matched = matched.filter((t) => t.genres.some((genre) => genre.toLowerCase().includes(g)));
    }

    if (options.query && options.query.trim()) {
      const q = options.query.toLowerCase().trim();
      matched = matched.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.synopsis.toLowerCase().includes(q) ||
          (t.creatorAttribution && t.creatorAttribution.toLowerCase().includes(q)) ||
          t.genres.some((genre) => genre.toLowerCase().includes(q)),
      );
    }

    const total = matched.length;
    const offset = Math.max(0, options.offset || 0);
    const limit = Math.max(1, Math.min(options.limit || 40, 100));
    const paged = matched.slice(offset, offset + limit);

    const titles = paged.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      kind: t.kind,
      synopsis: t.synopsis,
      year: t.year ?? 0,
      genres: t.genres,
      creatorAttribution: t.creatorAttribution || `${t.name} (${t.year || 2026})`,
      posterUrl: t.posterUrl || null,
      featured: Boolean(t.featured),
    }));

    return { titles, total };
  }
}

export const catalogService = new CatalogService();
