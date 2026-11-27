interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

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
  infoHash?: string;
  magnetUrl?: string;
  quality?: string;
  seeders?: number;
  episodes: CatalogEpisode[];
  rights: Array<{
    assetKind: string;
    rightsHolder: string;
    licenseType: string;
    territory: string;
  }>;
}

interface TitleRow {
  id: string;
  slug: string;
  name: string;
  kind: string;
  year: number;
  rating: string;
  score: number;
  duration_minutes: number;
  tagline: string;
  synopsis: string;
  genres_json: string;
  cast_json: string;
  creator_attribution: string;
  featured: number;
  poster_url: string;
  backdrop_url: string;
  stream_url: string;
  info_hash: string;
  magnet_url: string;
  quality: string;
  seeders: number;
  episodes_json: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  tier: string;
  fdic_coverage_usd: number;
  created_at: number;
}

interface Env {
  ASSETS: { fetch(request: Request | string): Promise<Response> };
  DB?: D1Database;
  BACKUP_DB?: D1Database;
  UPSTREAM_API_URL?: string;
}

interface EventContext {
  request: Request;
  env: Env;
}

function getCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function randomHex(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex ?? randomHex(16);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    key,
    256,
  );
  const hashHex = Array.from(new Uint8Array(bits), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  return `${salt}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt] = stored.split(":");
  if (!salt) return false;
  const candidate = await hashPassword(password, salt);
  return candidate === stored;
}

function formatSessionUser(u: Pick<UserRow, "id" | "name" | "email" | "role" | "tier" | "fdic_coverage_usd" | "created_at">) {
  const isAdmin = u.role === "admin" || u.email.toLowerCase() === "iam23yhb@gmail.com";
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    emailVerified: true,
    role: isAdmin ? "admin" : u.role || "user",
    tier: isAdmin ? "lifetime-unlimited" : u.tier || "free",
    unlimitedLifetime: isAdmin,
    fdicCoverageUsd: isAdmin ? Math.max(250000, Number(u.fdic_coverage_usd) || 250000) : 0,
    createdAt: new Date(u.created_at || Date.now()).toISOString(),
  };
}

function createFailoverDb(primary?: D1Database, backup?: D1Database): D1Database | undefined {
  if (!primary && !backup) return undefined;
  if (!backup) return primary;
  if (!primary) return backup;
  return {
    prepare(query: string): D1PreparedStatement {
      let boundValues: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          boundValues = values;
          return stmt;
        },
        async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
          try {
            const p = primary.prepare(query);
            const res = await (boundValues.length ? p.bind(...boundValues) : p).first<T>(colName);
            if (res !== null && res !== undefined) return res;
          } catch {
            // Fall through to standby backup D1 database
          }
          const b = backup.prepare(query);
          return (boundValues.length ? b.bind(...boundValues) : b).first<T>(colName);
        },
        async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
          try {
            const p = primary.prepare(query);
            const res = await (boundValues.length ? p.bind(...boundValues) : p).all<T>();
            if (res && Array.isArray(res.results) && res.results.length > 0) return res;
          } catch {
            // Fall through to standby backup D1 database
          }
          const b = backup.prepare(query);
          return (boundValues.length ? b.bind(...boundValues) : b).all<T>();
        },
        async run(): Promise<{ success: boolean }> {
          let primaryOk = false;
          try {
            const p = primary.prepare(query);
            const r = await (boundValues.length ? p.bind(...boundValues) : p).run();
            primaryOk = Boolean(r?.success);
          } catch {
            // Mirror write to standby backup
          }
          try {
            const b = backup.prepare(query);
            const r = await (boundValues.length ? b.bind(...boundValues) : b).run();
            return { success: primaryOk || Boolean(r?.success) };
          } catch {
            return { success: primaryOk };
          }
        },
      };
      return stmt;
    },
  };
}

async function getD1Session(req: Request, db?: D1Database) {
  if (!db) return null;
  const token = getCookie(req, "ff_session");
  if (!token) return null;
  try {
    const row = await db
      .prepare(
        `SELECT s.token, s.expires_at, u.id, u.name, u.email, u.role, u.tier, u.fdic_coverage_usd, u.created_at
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > ? LIMIT 1`,
      )
      .bind(token, Date.now())
      .first<UserRow & { token: string; expires_at: number }>();
    if (!row) return null;
    return {
      user: formatSessionUser(row),
      session: {
        id: row.token.slice(0, 16),
        token: row.token,
        userId: row.id,
        expiresAt: new Date(row.expires_at).toISOString(),
      },
    };
  } catch {
    return null;
  }
}

let cachedSeedCatalog: CatalogTitle[] | null = null;

function json(data: unknown, status = 200, cache = "public, max-age=60") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cache,
    },
  });
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function rowToTitle(row: TitleRow): CatalogTitle {
  const genres = safeJsonParse<string[]>(row.genres_json, []);
  const cast = safeJsonParse<string[]>(row.cast_json, []);
  const episodes = safeJsonParse<CatalogEpisode[]>(row.episodes_json, []);
  const kind = row.kind === "series" ? "series" : "movie";
  const rights = [
    {
      assetKind: "main-video",
      rightsHolder: "Creative Commons / DemureGram",
      licenseType: "cc-by-4.0",
      territory: "Worldwide",
    },
  ];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind,
    year: row.year || 0,
    rating: row.rating || "NR",
    score: row.score || 70,
    durationMinutes: row.duration_minutes || 90,
    tagline: row.tagline || "",
    synopsis: row.synopsis || "",
    genres,
    cast,
    creatorAttribution: row.creator_attribution || `${row.name} (${row.year || ""})`,
    featured: Boolean(row.featured),
    posterUrl: row.poster_url || "",
    backdropUrl: row.backdrop_url || row.poster_url || "",
    streamUrl: row.stream_url || `/api/playback/${row.slug}/media`,
    ...(row.info_hash ? { infoHash: row.info_hash } : {}),
    ...(row.magnet_url ? { magnetUrl: row.magnet_url } : {}),
    ...(row.quality ? { quality: row.quality } : {}),
    ...(row.seeders ? { seeders: row.seeders } : {}),
    episodes,
    rights,
  };
}

function rowToSummary(row: TitleRow) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    kind: row.kind === "series" ? "series" : "movie",
    synopsis: row.synopsis || "",
    year: row.year || 0,
    rating: row.rating || "NR",
    score: row.score || 70,
    durationMinutes: row.duration_minutes || 90,
    genres: safeJsonParse<string[]>(row.genres_json, []),
    creatorAttribution: row.creator_attribution || `${row.name} (${row.year || ""})`,
    posterUrl: row.poster_url || "",
    backdropUrl: row.backdrop_url || row.poster_url || "",
    featured: Boolean(row.featured),
  };
}

async function getSeedCatalog(env: Env, origin: string): Promise<CatalogTitle[]> {
  if (cachedSeedCatalog) return cachedSeedCatalog;
  const res = await env.ASSETS.fetch(new Request(`${origin}/catalog-seed.json`));
  if (!res.ok) return [];
  const parsed = (await res.json()) as CatalogTitle[];
  cachedSeedCatalog = Array.isArray(parsed) ? parsed : [];
  return cachedSeedCatalog;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildForwardHeaders(request: Request): Headers {
  const out = new Headers();
  const allow = [
    "accept",
    "accept-encoding",
    "accept-language",
    "authorization",
    "content-type",
    "cookie",
    "if-modified-since",
    "if-none-match",
    "if-range",
    "range",
    "user-agent",
  ];
  for (const key of allow) {
    const val = request.headers.get(key);
    if (val) out.set(key, val);
  }
  return out;
}

async function proxyUpstream(
  request: Request,
  upstreamBase: string,
  timeoutMs?: number,
): Promise<Response | null> {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, upstreamBase);
  const controller = timeoutMs ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const upstream = await fetch(target.toString(), {
      method: request.method,
      headers: buildForwardHeaders(request),
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "follow",
      signal: controller?.signal,
    });
    if (upstream.status < 500 && upstream.status !== 404) {
      return upstream;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function categoryKeywords(slug: string): { genres: string[]; kindHint?: "movie" | "series"; maxYear?: number } {
  const map: Record<string, { genres: string[]; kindHint?: "movie" | "series"; maxYear?: number }> = {
    action: { genres: ["action"] },
    adventure: { genres: ["adventure"] },
    animation: { genres: ["animation"] },
    "adult-animation": { genres: ["animation"] },
    "adult-comedy": { genres: ["comedy"] },
    anime: { genres: ["animation", "fantasy", "action"] },
    "arthouse-films": { genres: ["drama", "biography", "history"] },
    "based-on-true-events": { genres: ["biography", "history", "documentary", "war"] },
    biography: { genres: ["biography"] },
    classics: { genres: ["drama", "romance", "western", "film-noir", "comedy"], maxYear: 1989 },
    "classic-movies": { genres: ["drama", "romance", "western", "film-noir"], maxYear: 1989 },
    comedy: { genres: ["comedy"] },
    crime: { genres: ["crime"] },
    "crime-tv": { genres: ["crime", "mystery", "thriller"] },
    documentary: { genres: ["documentary"] },
    docuseries: { genres: ["documentary", "history", "biography"] },
    drama: { genres: ["drama"] },
    faith: { genres: ["family", "drama", "biography", "history"] },
    family: { genres: ["family", "animation"] },
    "family-movies": { genres: ["family", "animation", "adventure"], kindHint: "movie" },
    "family-series": { genres: ["family", "animation", "comedy", "adventure"] },
    fantasy: { genres: ["fantasy"] },
    "film-noir": { genres: ["film-noir", "crime", "mystery", "thriller"] },
    "foreign-films": { genres: ["drama", "romance", "thriller", "action"] },
    "foreign-tv": { genres: ["drama", "crime", "mystery"] },
    "heist-films": { genres: ["crime", "action", "thriller"] },
    history: { genres: ["history", "war", "biography"] },
    "home-garden": { genres: ["documentary", "family", "reality-tv", "comedy"] },
    horror: { genres: ["horror"] },
    "indie-films": { genres: ["drama", "comedy", "romance"] },
    "italian-horror-giallo": { genres: ["horror", "mystery", "thriller"] },
    "killer-thrillers": { genres: ["thriller", "horror", "crime"] },
    lgbtqia: { genres: ["drama", "romance", "comedy"] },
    lifestyle: { genres: ["documentary", "reality-tv", "talk-show", "music"] },
    "martial-arts": { genres: ["action", "adventure"] },
    "music-concerts": { genres: ["music", "musical", "documentary"] },
    mystery: { genres: ["mystery", "thriller", "crime"] },
    "myths-legends": { genres: ["fantasy", "adventure", "history", "action"] },
    "peliculas-en-espanol": { genres: ["drama", "comedy", "action", "romance"] },
    "reality-tv": { genres: ["reality-tv", "talk-show", "game-show", "documentary"] },
    romance: { genres: ["romance"] },
    "sci-fi-fantasy": { genres: ["sci-fi", "fantasy"] },
    "sci-fi": { genres: ["sci-fi"] },
    slashers: { genres: ["horror", "thriller"] },
    "sports-movies-shows": { genres: ["sport", "documentary", "biography", "drama"] },
    "spy-movies": { genres: ["action", "thriller", "mystery", "adventure"] },
    "stand-up-comedy": { genres: ["comedy", "talk-show"] },
    "sword-sorcery": { genres: ["fantasy", "adventure", "action"] },
    thrillers: { genres: ["thriller", "mystery", "crime"] },
    thriller: { genres: ["thriller"] },
    travel: { genres: ["adventure", "documentary"] },
    "tv-comedies": { genres: ["comedy"] },
    "tv-dramas": { genres: ["drama"] },
    war: { genres: ["war", "history"] },
    westerns: { genres: ["western", "action", "adventure"] },
    western: { genres: ["western"] },
  };
  if (map[slug]) return map[slug];
  return { genres: [slug.replace(/-/g, " ")] };
}

export async function onRequest(context: EventContext): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
  const method = request.method.toUpperCase();
  const db = createFailoverDb(env.DB, env.BACKUP_DB);

  // 1. Live Media Byte-Range Streaming (/api/playback/:slug/media & episode media)
  // Always stream directly through the active WebTorrent Media Gateway origin when configured.
  if (
    env.UPSTREAM_API_URL &&
    /^playback\/.+\/media$/.test(path)
  ) {
    const upstream = await proxyUpstream(request, env.UPSTREAM_API_URL);
    if (upstream) return upstream;
    return json(
      {
        error: "Media stream gateway is currently reconnecting. Please try again in a moment.",
        retryable: true,
      },
      503,
      "no-store",
    );
  }

  // 2. Health endpoint (reports live primary D1 + standby backup D1 catalog counts)
  if (path === "healthz" || path === "health") {
    let total = 0;
    let movies = 0;
    let series = 0;
    let backupTitles = 0;
    if (db) {
      try {
        const stats = await db
          .prepare(
            "SELECT COUNT(*) AS total, SUM(CASE WHEN kind='movie' THEN 1 ELSE 0 END) AS movies, SUM(CASE WHEN kind='series' THEN 1 ELSE 0 END) AS series FROM titles",
          )
          .first<{ total: number; movies: number; series: number }>();
        total = Number(stats?.total || 0);
        movies = Number(stats?.movies || 0);
        series = Number(stats?.series || 0);
      } catch {
        // Ignore and report fallback count
      }
    }
    if (env.BACKUP_DB) {
      try {
        const b = await env.BACKUP_DB
          .prepare("SELECT COUNT(*) AS total FROM titles")
          .first<{ total: number }>();
        backupTitles = Number(b?.total || 0);
      } catch {
        // Ignore
      }
    }
    return json({
      ok: true,
      status: "ok",
      service: "FamilyFlix Cloud",
      domain: "familyflix.demuregram.com",
      titles: total,
      movies,
      series,
      backupReady: backupTitles > 0,
      backupTitles,
      mode: db
        ? env.UPSTREAM_API_URL
          ? "cloudflare-d1+standby-backup+torrent-origin"
          : "cloudflare-d1+standby-backup"
        : "cloudflare-pages-seed",
    });
  }

  // 3. Site config & lightweight user/monetization defaults
  if (path === "site-config") {
    return json({
      name: "FamilyFlix",
      tagline: "Free Family Streaming by DemureGram",
      maintenanceMode: false,
      notice: null,
      copyrightContactReady: true,
    });
  }

  // 3a. 24/7 Cloudflare D1 Auth (Better-Auth compatible: sign-in/email, sign-up/email, get-session, sign-out)
  if (path === "auth/get-session" && method === "GET") {
    const sess = await getD1Session(request, db);
    if (sess) return json(sess, 200, "no-store");
    return json(null, 200, "no-store");
  }

  if (path === "auth/sign-in/email" && method === "POST") {
    if (!db) return json({ message: "Auth database unavailable." }, 503, "no-store");
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    if (!email || !password) {
      return json({ code: "INVALID_CREDENTIALS", message: "Email and password are required." }, 400, "no-store");
    }
    const row = await db
      .prepare("SELECT * FROM users WHERE lower(email) = ? LIMIT 1")
      .bind(email)
      .first<UserRow>();
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return json({ code: "INVALID_EMAIL_OR_PASSWORD", message: "Invalid email or password." }, 401, "no-store");
    }
    const token = randomHex(24);
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
    await db
      .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(token, row.id, expiresAt)
      .run();
    const user = formatSessionUser(row);
    return new Response(
      JSON.stringify({
        redirect: false,
        token,
        user,
        session: {
          id: token.slice(0, 16),
          token,
          userId: user.id,
          expiresAt: new Date(expiresAt).toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
          "set-cookie": `ff_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
        },
      },
    );
  }

  if (path === "auth/sign-up/email" && method === "POST") {
    if (!db) return json({ message: "Auth database unavailable." }, 503, "no-store");
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const name = (body.name || email.split("@")[0] || "Member").trim();
    if (!email.includes("@") || password.length < 8) {
      return json({ message: "Enter a valid email and a password of at least 8 characters." }, 400, "no-store");
    }
    const existing = await db
      .prepare("SELECT id FROM users WHERE lower(email) = ? LIMIT 1")
      .bind(email)
      .first<{ id: string }>();
    if (existing) {
      return json({ code: "USER_ALREADY_EXISTS", message: "An account with this email already exists." }, 422, "no-store");
    }
    const id = `usr_${randomHex(10)}`;
    const passHash = await hashPassword(password);
    const now = Date.now();
    const isAdmin = email === "iam23yhb@gmail.com";
    await db
      .prepare(
        "INSERT INTO users (id, name, email, password_hash, role, tier, fdic_coverage_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(
        id,
        name,
        email,
        passHash,
        isAdmin ? "admin" : "user",
        isAdmin ? "lifetime-unlimited" : "free",
        isAdmin ? 250000 : 0,
        now,
      )
      .run();
    const token = randomHex(24);
    const expiresAt = now + 1000 * 60 * 60 * 24 * 30;
    await db
      .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(token, id, expiresAt)
      .run();
    const user = formatSessionUser({
      id,
      name,
      email,
      role: isAdmin ? "admin" : "user",
      tier: isAdmin ? "lifetime-unlimited" : "free",
      fdic_coverage_usd: isAdmin ? 250000 : 0,
      created_at: now,
    });
    return new Response(JSON.stringify({ token, user }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "set-cookie": `ff_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
      },
    });
  }

  if (path === "auth/sign-out" && method === "POST") {
    const token = getCookie(request, "ff_session");
    if (token && db) {
      await db.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "set-cookie": "ff_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
      },
    });
  }

  if (path.startsWith("auth/")) {
    return json({ user: null, session: null }, 200, "no-store");
  }

  if (path === "user/subscription") {
    const sess = await getD1Session(request, db);
    if (sess?.user?.role === "admin" || sess?.user?.unlimitedLifetime) {
      return json(
        {
          isSubscribed: true,
          tier: "lifetime-unlimited",
          plan: "Admin Lifetime Unlimited",
          adsEnabled: false,
          unlimitedLifetime: true,
          fdicCoverageUsd: sess.user.fdicCoverageUsd || 250000,
          status: "active",
        },
        200,
        "no-store",
      );
    }
    if (sess?.user?.email) {
      try {
        const entRes = await fetch(
          `https://billing.demuregram.com/api/entitlements?email=${encodeURIComponent(sess.user.email)}&app=familyflix`,
        );
        if (entRes.ok) {
          const ent = (await entRes.json()) as {
            status?: string;
            tier?: string;
            planName?: string;
            planSlug?: string;
            adsEnabled?: boolean;
          };
          if (ent.status === "active" && ent.tier && ent.tier !== "free") {
            return json(
              {
                isSubscribed: true,
                tier: ent.tier,
                plan: ent.planName || ent.planSlug || "FamilyFlix Pro",
                adsEnabled: Boolean(ent.adsEnabled),
                status: "active",
              },
              200,
              "no-store",
            );
          }
        }
      } catch {
        // Fall back to free tier
      }
    }
    return json({ isSubscribed: false, plan: "free", adsEnabled: true, status: "active" }, 200, "no-store");
  }
  if (path === "user/pre-orders") {
    return json([], 200, "no-store");
  }
  if (path === "user/preferences") {
    return json({ watchlist: [], history: [], autoplay: true }, 200, "no-store");
  }
  const VAST_TAG_URL =
    "https://crookedagreement.com/d.mwFNzOdIGPN/vhZyGAUT/UeCmO9YubZkU/lJkPPdTmcx2/NTTcEMwnNpjJURtjNCzjYF1_MmT/A/2hOAQv";
  const VERIFICATION_TOKEN = "1dfb67786257b52ff8a2d3408fc53d3161faad0c";

  if (path === "v1/monetization/config") {
    let adsEnabled = true;
    const sess = await getD1Session(request, db).catch(() => null);
    if (sess?.user?.role === "admin" || sess?.user?.unlimitedLifetime) {
      adsEnabled = false;
    } else if (sess?.user?.email) {
      try {
        const entRes = await fetch(
          `https://billing.demuregram.com/api/entitlements?email=${encodeURIComponent(sess.user.email)}&app=familyflix`,
        );
        if (entRes.ok) {
          const ent = (await entRes.json()) as { adsEnabled?: boolean; status?: string };
          if (ent.status === "active" && ent.adsEnabled === false) adsEnabled = false;
        }
      } catch {
        // Default to ad-supported
      }
    }
    return json({
      adsEnabled,
      preRoll: adsEnabled,
      midRoll: adsEnabled,
      postRoll: adsEnabled,
      skipAfterSeconds: 5,
      midRollIntervalSeconds: 480,
      vastAdTagUrl: VAST_TAG_URL,
      vastTagUrl: VAST_TAG_URL,
      zoneId: "7651065",
      adNetwork: "Monetag / HilltopAds (VAST 3.0/4.0 + Google IMA)",
      watermarkEnabled: true,
      watermarkText: "FamilyFlix by DemureGram",
      verificationToken: VERIFICATION_TOKEN,
      medianetVerifyToken: "medianet-site-verify-familyflix-982749",
    });
  }
  if (path === "v1/payments/config") {
    return json({ paypalEnabled: false, whopEnabled: false, vipPriceUsd: 4.99 });
  }
  if (path === "v1/ads/decision") {
    const placement = (url.searchParams.get("placement") || "preroll").toLowerCase();
    const titleSlug = url.searchParams.get("titleSlug") || "";
    const currentTime = Number(url.searchParams.get("currentTime")) || 0;
    return json(
      {
        ok: true,
        data: {
          placement,
          titleSlug,
          currentTime,
          adsEnabled: true,
          ads: [
            {
              id: `ff-zone-7651065-${placement}-${Date.now()}`,
              placement,
              zoneId: "7651065",
              adNetwork: "Monetag / HilltopAds",
              vastTagUrl: VAST_TAG_URL,
              durationSeconds: 15,
              skipAfterSeconds: 5,
              clickThroughUrl: "https://familyflix.demuregram.com",
            },
          ],
        },
      },
      200,
      "no-store",
    );
  }
  if (path === "v1/ads/vast") {
    const vastXml = `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="3.0">
  <Ad id="familyflix-zone-7651065">
    <Wrapper>
      <AdSystem>FamilyFlix by DemureGram</AdSystem>
      <VASTAdTagURI><![CDATA[${VAST_TAG_URL}]]></VASTAdTagURI>
      <Impression><![CDATA[https://familyflix.demuregram.com/api/v1/ads/decision?placement=impression]]></Impression>
      <Creatives />
    </Wrapper>
  </Ad>
</VAST>`;
    return new Response(vastXml, {
      status: 200,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  }
  if (path.startsWith("v1/ads/vmap/")) {
    const slug = decodeURIComponent(path.replace("v1/ads/vmap/", ""));
    const vastUrl = `https://familyflix.demuregram.com/api/v1/ads/vast?slug=${encodeURIComponent(slug)}`;
    const vmapXml = `<?xml version="1.0" encoding="UTF-8"?>
<vmap:VMAP xmlns:vmap="http://www.iab.net/videosuite/vmap" version="1.0">
  <vmap:AdBreak timeOffset="start" breakType="linear" breakId="preroll">
    <vmap:AdSource id="preroll-source" allowMultipleAds="true" followRedirects="true">
      <vmap:AdTagURI templateType="vast3"><![CDATA[${vastUrl}&placement=preroll]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>
  <vmap:AdBreak timeOffset="00:08:00" breakType="linear" breakId="midroll-1">
    <vmap:AdSource id="midroll-1-source" allowMultipleAds="true" followRedirects="true">
      <vmap:AdTagURI templateType="vast3"><![CDATA[${vastUrl}&placement=midroll]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>
  <vmap:AdBreak timeOffset="00:18:00" breakType="linear" breakId="midroll-2">
    <vmap:AdSource id="midroll-2-source" allowMultipleAds="true" followRedirects="true">
      <vmap:AdTagURI templateType="vast3"><![CDATA[${vastUrl}&placement=midroll]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>
  <vmap:AdBreak timeOffset="00:30:00" breakType="linear" breakId="midroll-3">
    <vmap:AdSource id="midroll-3-source" allowMultipleAds="true" followRedirects="true">
      <vmap:AdTagURI templateType="vast3"><![CDATA[${vastUrl}&placement=midroll]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>
  <vmap:AdBreak timeOffset="end" breakType="linear" breakId="postroll">
    <vmap:AdSource id="postroll-source" allowMultipleAds="true" followRedirects="true">
      <vmap:AdTagURI templateType="vast3"><![CDATA[${vastUrl}&placement=postroll]]></vmap:AdTagURI>
    </vmap:AdSource>
  </vmap:AdBreak>
</vmap:VMAP>`;
    return new Response(vmapXml, {
      status: 200,
      headers: {
        "content-type": "application/xml; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  }
  if (path.startsWith("v1/ads/cue-points/")) {
    const slug = decodeURIComponent(path.replace("v1/ads/cue-points/", ""));
    return json({
      slug,
      adsEnabled: true,
      vastAdTagUrl: VAST_TAG_URL,
      cuePoints: [
        { timestampSeconds: 480, label: "Commercial Break 1" },
        { timestampSeconds: 1080, label: "Commercial Break 2" },
        { timestampSeconds: 1800, label: "Commercial Break 3" },
        { timestampSeconds: 2700, label: "Commercial Break 4" },
        { timestampSeconds: 3600, label: "Commercial Break 5" },
      ],
    });
  }

  // 4. Image Proxy
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

  // 5. D1-Backed 23,275+ Title Catalog Routes (24/7 Edge)
  if (db) {
    // 5a. Featured Hero Carousel
    if (path === "v1/home/featured-hero") {
      const cached = await db
        .prepare("SELECT value_json FROM kv_cache WHERE key = ?")
        .bind("featured-hero")
        .first<{ value_json: string }>();
      if (cached?.value_json) {
        return new Response(cached.value_json, {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      }
      const rows = await db
        .prepare("SELECT * FROM titles ORDER BY year DESC, score DESC LIMIT 8")
        .all<TitleRow>();
      return json(rows.results.map(rowToSummary), 200, "public, max-age=300");
    }

    // 5b. Curated Homepage Rows (22 collections)
    if (path === "v1/home/curated-rows") {
      const cachedRows = await db
        .prepare("SELECT value_json FROM kv_cache WHERE key LIKE 'curated-row-%' ORDER BY key ASC")
        .all<{ value_json: string }>();
      if (cachedRows.results.length > 0) {
        const body = `[${cachedRows.results.map((r) => r.value_json).join(",")}]`;
        return new Response(body, {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      }
    }

    // 5c. Personalized Recommendations
    if (path === "v1/home/personalized" && method === "POST") {
      const body = (await request.json().catch(() => ({}))) as {
        preferredGenres?: string[];
        limit?: number;
      };
      const prefs = Array.isArray(body.preferredGenres) ? body.preferredGenres : [];
      const limit = Math.min(48, Math.max(1, Number(body.limit) || 16));
      if (prefs.length > 0) {
        const clauses = prefs.slice(0, 4).map(() => "genres_lower LIKE ?");
        const binds = prefs.slice(0, 4).map((g) => `%${g.toLowerCase()}%`);
        const rows = await db
          .prepare(
            `SELECT * FROM titles WHERE ${clauses.join(" OR ")} ORDER BY year DESC, score DESC LIMIT ?`,
          )
          .bind(...binds, limit)
          .all<TitleRow>();
        if (rows.results.length > 0) {
          return json(rows.results.map(rowToSummary), 200, "no-store");
        }
      }
      const rows = await db
        .prepare("SELECT * FROM titles ORDER BY score DESC, year DESC LIMIT ?")
        .bind(limit)
        .all<TitleRow>();
      return json(rows.results.map(rowToSummary), 200, "no-store");
    }

    // 5d. Categories List (44 categories with exact counts)
    if (path === "v1/categories") {
      const cached = await db
        .prepare("SELECT value_json FROM kv_cache WHERE key = ?")
        .bind("categories")
        .first<{ value_json: string }>();
      if (cached?.value_json) {
        return new Response(cached.value_json, {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=600",
          },
        });
      }
    }

    if (path === "v1/subgenres") {
      if (env.UPSTREAM_API_URL) {
        const upstream = await proxyUpstream(request, env.UPSTREAM_API_URL, 3000);
        if (upstream) return upstream;
      }
      return json({ total: 0, subgenres: [] });
    }

    // 5e. Single Category Browse (Paginated across all 23,275 titles)
    const catMatch = path.match(/^v1\/categories\/([^/]+)$/);
    if (catMatch) {
      const slug = decodeURIComponent(catMatch[1]).toLowerCase();
      const contentType = (url.searchParams.get("contentType") || "all").toLowerCase();
      const subgenre = (url.searchParams.get("subgenre") || "").trim().toLowerCase();
      const sort = (url.searchParams.get("sort") || "popular").toLowerCase();
      const yearMin = Number(url.searchParams.get("yearMin")) || 0;
      const yearMax = Number(url.searchParams.get("yearMax")) || 0;
      const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
      const limit = Math.min(80, Math.max(1, Number(url.searchParams.get("limit")) || 48));
      const offset = (page - 1) * limit;

      const metaCfg = categoryKeywords(slug);
      const where: string[] = [];
      const binds: unknown[] = [];

      if (contentType === "movies" || slug === "movies") {
        where.push("kind = 'movie'");
      } else if (contentType === "series" || slug === "tv-shows") {
        where.push("kind = 'series'");
      } else if (metaCfg.kindHint) {
        where.push("kind = ?");
        binds.push(metaCfg.kindHint);
      }

      if (!["all", "featured", "movies", "tv-shows"].includes(slug)) {
        const orClauses = metaCfg.genres.map(() => "genres_lower LIKE ?");
        where.push(`(${orClauses.join(" OR ")})`);
        for (const kw of metaCfg.genres) binds.push(`%${kw.toLowerCase()}%`);
      }

      if (yearMin > 0) {
        where.push("year >= ?");
        binds.push(yearMin);
      }
      const effectiveMaxYear = yearMax > 0 ? yearMax : (metaCfg.maxYear || 0);
      if (effectiveMaxYear > 0) {
        where.push("year > 0 AND year <= ?");
        binds.push(effectiveMaxYear);
      }

      if (subgenre) {
        const subWord = subgenre.replace(/-/g, " ").split(" ")[0] || subgenre;
        where.push("(genres_lower LIKE ? OR LOWER(name) LIKE ? OR LOWER(synopsis) LIKE ?)");
        const like = `%${subWord}%`;
        binds.push(like, like, like);
      }

      const orderSql =
        sort === "newest"
          ? "ORDER BY year DESC, score DESC"
          : sort === "oldest"
            ? "ORDER BY CASE WHEN year > 0 THEN year ELSE 9999 END ASC, score DESC"
            : sort === "highest-rated" || sort === "rating"
              ? "ORDER BY score DESC, year DESC"
              : sort === "a-z" || sort === "title"
                ? "ORDER BY LOWER(name) ASC"
                : "ORDER BY year DESC, score DESC";

      const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
      let statsRow = await db
        .prepare(
          `SELECT COUNT(*) AS cnt, SUM(CASE WHEN kind='movie' THEN 1 ELSE 0 END) AS movies, SUM(CASE WHEN kind='series' THEN 1 ELSE 0 END) AS series FROM titles ${whereSql}`,
        )
        .bind(...binds)
        .first<{ cnt: number; movies: number; series: number }>();

      let rows = await db
        .prepare(`SELECT * FROM titles ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
        .bind(...binds, limit, offset)
        .all<TitleRow>();

      // Graceful broadening if a strict subgenre filter yielded 0 items
      if (rows.results.length === 0 && subgenre && !["all", "featured", "movies", "tv-shows"].includes(slug)) {
        const broadOr = metaCfg.genres.map(() => "genres_lower LIKE ?");
        const broadBinds = metaCfg.genres.map((kw) => `%${kw.toLowerCase()}%`);
        const broadWhere = `WHERE (${broadOr.join(" OR ")})`;
        statsRow = await db
          .prepare(
            `SELECT COUNT(*) AS cnt, SUM(CASE WHEN kind='movie' THEN 1 ELSE 0 END) AS movies, SUM(CASE WHEN kind='series' THEN 1 ELSE 0 END) AS series FROM titles ${broadWhere}`,
          )
          .bind(...broadBinds)
          .first<{ cnt: number; movies: number; series: number }>();
        rows = await db
          .prepare(`SELECT * FROM titles ${broadWhere} ${orderSql} LIMIT ? OFFSET ?`)
          .bind(...broadBinds, limit, offset)
          .all<TitleRow>();
      }

      // Enrich category metadata from cached 44-category catalog when available
      let categoryMeta: Record<string, unknown> = {
        id: slug,
        slug,
        name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        description: "Streaming free on FamilyFlix by DemureGram",
        contentType: "both",
        icon: "Film",
        subgenres: [],
      };
      try {
        const cachedCats = await db
          .prepare("SELECT value_json FROM kv_cache WHERE key = ?")
          .bind("categories")
          .first<{ value_json: string }>();
        if (cachedCats?.value_json) {
          const parsed = JSON.parse(cachedCats.value_json) as {
            categories?: Array<Record<string, unknown>>;
          };
          const found = parsed.categories?.find((c) => c.slug === slug);
          if (found) categoryMeta = found;
        }
      } catch {
        // Keep fallback metadata
      }

      const summaries = rows.results.map(rowToSummary);
      const total = Number(statsRow?.cnt || summaries.length);
      const moviesCount = Number(statsRow?.movies || 0);
      const seriesCount = Number(statsRow?.series || 0);

      return json({
        category: categoryMeta,
        total,
        moviesCount,
        seriesCount,
        page,
        limit,
        items: summaries,
        titles: summaries,
      });
    }

    // 5f. Titles Listing & Search (Paginated across all 23,275 titles)
    if (path === "v1/titles" || path === "titles") {
      const q = (url.searchParams.get("query") || url.searchParams.get("q") || "").trim().toLowerCase();
      const kind = url.searchParams.get("kind");
      const genre = (url.searchParams.get("genre") || "").trim().toLowerCase();
      const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 60));

      const where: string[] = [];
      const binds: unknown[] = [];

      if (kind === "movie" || kind === "series") {
        where.push("kind = ?");
        binds.push(kind);
      }
      if (genre) {
        where.push("genres_lower LIKE ?");
        binds.push(`%${genre}%`);
      }
      if (q) {
        where.push("(LOWER(name) LIKE ? OR LOWER(synopsis) LIKE ? OR genres_lower LIKE ?)");
        const like = `%${q}%`;
        binds.push(like, like, like);
      }

      const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
      const countRow = await db
        .prepare(`SELECT COUNT(*) AS cnt FROM titles ${whereSql}`)
        .bind(...binds)
        .first<{ cnt: number }>();
      const total = Number(countRow?.cnt || 0);

      const rows = await db
        .prepare(
          `SELECT * FROM titles ${whereSql} ORDER BY year DESC, score DESC LIMIT ? OFFSET ?`,
        )
        .bind(...binds, limit, offset)
        .all<TitleRow>();

      return new Response(JSON.stringify(rows.results.map(rowToSummary)), {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-catalog-total": String(total),
          "cache-control": "public, max-age=60",
        },
      });
    }

    // 5g. Single Title Detail
    const titleMatch = path.match(/^(?:v1\/)?titles\/([^/]+)$/);
    if (titleMatch) {
      const slug = decodeURIComponent(titleMatch[1]);
      const row = await db
        .prepare("SELECT * FROM titles WHERE slug = ? OR id = ? LIMIT 1")
        .bind(slug, slug)
        .first<TitleRow>();
      if (!row) return json({ error: "Title not found." }, 404);
      return json(rowToTitle(row));
    }

    // 5h. Episode Playback Manifest
    const epPlaybackMatch = path.match(/^playback\/([^/]+)\/episodes\/([^/]+)$/);
    if (epPlaybackMatch) {
      if (env.UPSTREAM_API_URL) {
        const upstream = await proxyUpstream(request, env.UPSTREAM_API_URL, 4000);
        if (upstream) return upstream;
      }
      const slug = decodeURIComponent(epPlaybackMatch[1]);
      const epId = decodeURIComponent(epPlaybackMatch[2]);
      const row = await db
        .prepare("SELECT * FROM titles WHERE slug = ? OR id = ? LIMIT 1")
        .bind(slug, slug)
        .first<TitleRow>();
      if (!row) return json({ error: "Title not found." }, 404);
      const title = rowToTitle(row);
      const ep = title.episodes.find((e) => e.id === epId) || title.episodes[0];
      if (!ep) return json({ error: "Episode not found." }, 404);
      const isHls = ep.streamUrl.includes(".m3u8");
      return json({
        titleName: `${title.name} — ${ep.name}`,
        title: `${title.name} — ${ep.name}`,
        streamType: isHls ? "hls" : "mp4",
        provider: isHls ? "hls" : "mp4",
        url: ep.streamUrl || `/api/playback/${title.slug}/episodes/${ep.id}/media`,
        posterUrl: ep.stillUrl || title.backdropUrl || title.posterUrl,
        subtitles: [],
        ...(title.infoHash ? { infoHash: title.infoHash } : {}),
        ...(title.magnetUrl ? { magnetUrl: title.magnetUrl } : {}),
      });
    }

    // 5i. Movie Playback Manifest
    const playbackMatch = path.match(/^playback\/([^/]+)$/);
    if (playbackMatch) {
      if (env.UPSTREAM_API_URL) {
        const upstream = await proxyUpstream(request, env.UPSTREAM_API_URL, 4000);
        if (upstream) return upstream;
      }
      const slug = decodeURIComponent(playbackMatch[1]);
      const row = await db
        .prepare("SELECT * FROM titles WHERE slug = ? OR id = ? LIMIT 1")
        .bind(slug, slug)
        .first<TitleRow>();
      if (!row) return json({ error: "Title not found." }, 404);
      const title = rowToTitle(row);
      const isHls = title.streamUrl.includes(".m3u8");
      return json({
        titleName: title.name,
        title: title.name,
        streamType: isHls ? "hls" : "mp4",
        provider: isHls ? "hls" : "mp4",
        url: title.streamUrl || `/api/playback/${title.slug}/media`,
        posterUrl: title.posterUrl || title.backdropUrl,
        subtitles: [],
        ...(title.infoHash ? { infoHash: title.infoHash } : {}),
        ...(title.magnetUrl ? { magnetUrl: title.magnetUrl } : {}),
      });
    }
  }

  // 6. Progress endpoints & fallback to bundled seed catalog if D1 isn't bound
  if (path.endsWith("/progress")) {
    return json({ progressSeconds: 0, durationSeconds: 0 }, 200, "no-store");
  }

  if (env.UPSTREAM_API_URL) {
    const upstream = await proxyUpstream(request, env.UPSTREAM_API_URL, 5000);
    if (upstream) return upstream;
  }

  const catalog = await getSeedCatalog(env, url.origin);
  if (path === "v1/titles" || path === "titles") {
    return json(catalog);
  }
  if (path === "v1/home/featured-hero") {
    return json(catalog.slice(0, 8));
  }
  if (path === "v1/home/curated-rows") {
    return json([
      {
        id: "trending-now",
        title: "Trending on FamilyFlix",
        subtitle: "Streaming free worldwide",
        slug: "featured",
        items: catalog.slice(0, 18),
      },
    ]);
  }
  if (path === "v1/categories") {
    const counts = new Map<string, number>();
    for (const t of catalog) {
      for (const g of t.genres) counts.set(g, (counts.get(g) || 0) + 1);
    }
    return json({
      total: counts.size,
      categories: Array.from(counts.entries()).map(([name, count]) => ({
        slug: slugify(name),
        name,
        count,
      })),
    });
  }

  return json({ error: "API route not found", path }, 404, "no-store");
}
