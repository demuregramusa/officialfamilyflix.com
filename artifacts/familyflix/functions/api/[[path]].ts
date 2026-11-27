interface CatalogEpisode {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  synopsis: string;
  durationMinutes: number;
  stillUrl: string;
  streamUrl: string;
}

interface CatalogTitle {
  id: string;
  slug: string;
  name: string;
  kind: "movie" | "series";
  year: number;
  rating: string;
  score: number;
  durationMinutes: number;
  tagline: string;
  synopsis: string;
  genres: string[];
  cast: string[];
  creatorAttribution: string;
  featured: boolean;
  posterUrl: string;
  backdropUrl: string;
  streamUrl: string;
  episodes: CatalogEpisode[];
  rights: Array<{
    assetKind: string;
    rightsHolder: string;
    licenseType: string;
    territory: string;
  }>;
}

interface Env {
  ASSETS: { fetch(request: Request | string): Promise<Response> };
  UPSTREAM_API_URL?: string;
}

interface EventContext {
  request: Request;
  env: Env;
}

let cachedCatalog: CatalogTitle[] | null = null;

function json(data: unknown, status = 200, cache = "public, max-age=60") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
    },
  });
}

async function getCatalog(env: Env, origin: string): Promise<CatalogTitle[]> {
  if (cachedCatalog) return cachedCatalog;
  const res = await env.ASSETS.fetch(new Request(`${origin}/catalog-seed.json`));
  if (!res.ok) return [];
  const parsed = (await res.json()) as CatalogTitle[];
  cachedCatalog = Array.isArray(parsed) ? parsed : [];
  return cachedCatalog;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function onRequest(context: EventContext): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);

  // If an external FamilyFlix PostgreSQL API server URL is configured, proxy transparently to it
  if (env.UPSTREAM_API_URL) {
    try {
      const target = new URL(url.pathname + url.search, env.UPSTREAM_API_URL);
      const upstream = await fetch(target.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      });
      if (upstream.status < 500 && upstream.status !== 404) {
        return upstream;
      }
    } catch {
      // Fall back to Cloudflare Pages bundled catalog seamlessly
    }
  }

  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
  const method = request.method.toUpperCase();
  const catalog = await getCatalog(env, url.origin);

  // Health
  if (path === "healthz" || path === "health") {
    return json({
      ok: true,
      service: "FamilyFlix Cloud",
      domain: "familyflix.demuregram.com",
      titles: catalog.length,
      mode: env.UPSTREAM_API_URL ? "upstream-proxy+fallback" : "cloudflare-pages-catalog",
    });
  }

  // Site config
  if (path === "site-config") {
    return json({
      name: "FamilyFlix",
      tagline: "Free Family Streaming by DemureGram",
      maintenanceMode: false,
      notice: null,
      copyrightContactReady: true,
    });
  }

  // Auth / User session & preferences (clean unauthenticated defaults)
  if (path.startsWith("auth/")) {
    return json({ user: null, session: null }, 200, "no-store");
  }
  if (path === "user/subscription") {
    return json({ isSubscribed: false, plan: "free", status: "active" }, 200, "no-store");
  }
  if (path === "user/pre-orders") {
    return json([], 200, "no-store");
  }
  if (path === "user/preferences") {
    return json({ watchlist: [], history: [], autoplay: true }, 200, "no-store");
  }

  // Monetization / Ads / Payments config
  if (path === "v1/monetization/config") {
    return json({ adsEnabled: false, preRoll: false, midRoll: false, skipAfterSeconds: 5 });
  }
  if (path === "v1/payments/config") {
    return json({ paypalEnabled: false, whopEnabled: false, vipPriceUsd: 4.99 });
  }
  if (path.startsWith("v1/ads/cue-points/")) {
    return json({ cuePoints: [], adsEnabled: false });
  }

  // Image proxy
  if (path === "v1/image-proxy") {
    const imgUrl = url.searchParams.get("url");
    if (!imgUrl || !/^https?:\/\//i.test(imgUrl)) {
      return new Response("Invalid URL", { status: 400 });
    }
    try {
      const proxied = await fetch(imgUrl, { headers: { "user-agent": "FamilyFlix/1.0" } });
      if (proxied.ok) {
        return new Response(proxied.body, {
          status: 200,
          headers: {
            "content-type": proxied.headers.get("content-type") || "image/jpeg",
            "cache-control": "public, max-age=86400",
          },
        });
      }
    } catch {
      // Fallback below
    }
    return env.ASSETS.fetch(new Request(`${url.origin}/avatars/demure/demure-familyflix-crew.jpg`));
  }

  // Featured Hero Carousel
  if (path === "v1/home/featured-hero") {
    const featured = catalog.filter((t) => t.featured);
    const hero = (featured.length >= 4 ? featured : catalog).slice(0, 8);
    return json(hero);
  }

  // Curated Home Rows
  if (path === "v1/home/curated-rows") {
    const movies = catalog.filter((t) => t.kind === "movie");
    const series = catalog.filter((t) => t.kind === "series");
    const byGenre = (g: string) =>
      catalog.filter((t) =>
        t.genres.some((item) => item.toLowerCase().includes(g.toLowerCase())),
      );

    const rows = [
      {
        id: "trending-now",
        title: "Trending on FamilyFlix",
        subtitle: "Popular movies and series streaming free worldwide",
        slug: "featured",
        items: catalog.slice(0, 18),
      },
      {
        id: "featured-movies",
        title: "Free Movies & Restored Classics",
        subtitle: "Instant HD playback with verified rights",
        slug: "movies",
        items: movies.slice(0, 18),
      },
      {
        id: "tv-series",
        title: "Binge-Worthy TV Series",
        subtitle: "Complete episodes ready to watch",
        slug: "tv-shows",
        items: series.slice(0, 18),
      },
      {
        id: "family-animation",
        title: "Family & Kids Favorites",
        subtitle: "Safe, joyful entertainment for every generation",
        slug: "family",
        items: byGenre("family").slice(0, 18),
      },
      {
        id: "action-adventure",
        title: "Action & Adventure",
        subtitle: "High-energy thrills and epic journeys",
        slug: "action",
        items: byGenre("action").slice(0, 18),
      },
      {
        id: "comedy-laughs",
        title: "Comedy & Good Vibes",
        subtitle: "Lighthearted hits and feel-good laughs",
        slug: "comedy",
        items: byGenre("comedy").slice(0, 18),
      },
      {
        id: "drama-stories",
        title: "Compelling Dramas",
        subtitle: "Character-driven stories and acclaimed performances",
        slug: "drama",
        items: byGenre("drama").slice(0, 18),
      },
      {
        id: "documentary-history",
        title: "Documentary & History",
        subtitle: "Real stories and Library of Congress archival cinema",
        slug: "documentary",
        items: byGenre("documentary").slice(0, 18),
      },
      {
        id: "thriller-mystery",
        title: "Mystery, Sci-Fi & Thriller",
        subtitle: "Edge-of-your-seat twists and supernatural worlds",
        slug: "thriller",
        items: [...byGenre("thriller"), ...byGenre("mystery"), ...byGenre("horror")].slice(0, 18),
      },
    ].filter((r) => r.items.length > 0);

    return json(rows);
  }

  // Personalized Recommendations
  if (path === "v1/home/personalized" && method === "POST") {
    const body = (await request.json().catch(() => ({}))) as {
      preferredGenres?: string[];
      limit?: number;
    };
    const prefs = Array.isArray(body.preferredGenres) ? body.preferredGenres : [];
    const limit = Number(body.limit) || 16;
    let pool = catalog;
    if (prefs.length > 0) {
      const matched = catalog.filter((t) =>
        t.genres.some((g) => prefs.some((p) => g.toLowerCase().includes(p.toLowerCase()))),
      );
      if (matched.length > 0) pool = matched;
    }
    return json(pool.slice(0, limit));
  }

  // Categories list
  if (path === "v1/categories") {
    const counts = new Map<string, number>();
    for (const t of catalog) {
      for (const g of t.genres) {
        counts.set(g, (counts.get(g) || 0) + 1);
      }
    }
    const categories = Array.from(counts.entries())
      .map(([name, count]) => ({
        slug: slugify(name),
        name,
        count,
        description: `Browse ${count} ${name} titles on FamilyFlix`,
      }))
      .sort((a, b) => b.count - a.count);
    return json({ total: categories.length, categories });
  }

  if (path === "v1/subgenres") {
    return json({ total: 0, subgenres: [] });
  }

  // Single category browse
  const catMatch = path.match(/^v1\/categories\/([^/]+)$/);
  if (catMatch) {
    const slug = decodeURIComponent(catMatch[1]).toLowerCase();
    const contentType = url.searchParams.get("contentType") || "all";
    let matched = catalog.filter((t) => {
      if (contentType === "movies" && t.kind !== "movie") return false;
      if (contentType === "series" && t.kind !== "series") return false;
      if (slug === "all" || slug === "featured" || slug === "movies" || slug === "tv-shows") {
        if (slug === "movies") return t.kind === "movie";
        if (slug === "tv-shows") return t.kind === "series";
        return true;
      }
      return t.genres.some((g) => slugify(g) === slug || g.toLowerCase().includes(slug));
    });
    if (matched.length === 0) matched = catalog.slice(0, 24);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(80, Math.max(1, Number(url.searchParams.get("limit")) || 40));
    const start = (page - 1) * limit;
    return json({
      category: {
        slug,
        name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: "Streaming free on FamilyFlix by DemureGram",
      },
      total: matched.length,
      page,
      limit,
      titles: matched.slice(start, start + limit),
    });
  }

  // Titles listing & search
  if (path === "v1/titles" || path === "titles") {
    const q = (url.searchParams.get("query") || url.searchParams.get("q") || "").trim().toLowerCase();
    const kind = url.searchParams.get("kind");
    const genre = (url.searchParams.get("genre") || "").trim().toLowerCase();
    const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));

    let list = catalog;
    if (kind === "movie" || kind === "series") {
      list = list.filter((t) => t.kind === kind);
    }
    if (genre) {
      list = list.filter((t) => t.genres.some((g) => g.toLowerCase().includes(genre)));
    }
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.synopsis.toLowerCase().includes(q) ||
          t.genres.some((g) => g.toLowerCase().includes(q)),
      );
    }
    const sliced = list.slice(offset, offset + limit);
    return new Response(JSON.stringify(sliced), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "x-catalog-total": String(list.length),
        "cache-control": "public, max-age=60",
      },
    });
  }

  // Single title detail
  const titleMatch = path.match(/^(?:v1\/)?titles\/([^/]+)$/);
  if (titleMatch) {
    const slug = decodeURIComponent(titleMatch[1]);
    const found = catalog.find((t) => t.slug === slug || t.id === slug);
    if (!found) return json({ error: "Title not found." }, 404);
    return json(found);
  }

  // Playback endpoint (movie or episode)
  const epPlaybackMatch = path.match(/^playback\/([^/]+)\/episodes\/([^/]+)$/);
  if (epPlaybackMatch) {
    const slug = decodeURIComponent(epPlaybackMatch[1]);
    const epId = decodeURIComponent(epPlaybackMatch[2]);
    const found = catalog.find((t) => t.slug === slug || t.id === slug);
    const ep = found?.episodes.find((e) => e.id === epId) || found?.episodes[0];
    if (!found || !ep) return json({ error: "Episode not found." }, 404);
    return json({
      url: ep.streamUrl,
      provider: "hls",
      title: `${found.name} — ${ep.name}`,
      posterUrl: ep.stillUrl || found.backdropUrl,
      subtitles: [],
    });
  }

  const playbackMatch = path.match(/^playback\/([^/]+)$/);
  if (playbackMatch) {
    const slug = decodeURIComponent(playbackMatch[1]);
    const found = catalog.find((t) => t.slug === slug || t.id === slug);
    if (!found) return json({ error: "Title not found." }, 404);
    return json({
      url: found.streamUrl,
      provider: "hls",
      title: found.name,
      posterUrl: found.backdropUrl || found.posterUrl,
      subtitles: [],
    });
  }

  if (path.endsWith("/progress")) {
    return json({ progressSeconds: 0, durationSeconds: 0 }, 200, "no-store");
  }

  return json({ error: "API route not found", path }, 404, "no-store");
}
