# FamilyFlix — Developer & Handoff Guide

Last updated: 18 November 2026
Owner: FamilyFlix Media, Inc.
Production site: https://familyflix.demuregram.com
Public developer docs: `/developers`

This is the handoff document for the next engineer. It explains how the app is
built, where content comes from, how to update the catalog safely, and how the
public developer API works.

---

## 1. What this is

FamilyFlix is a free, ad-supported streaming site built with the Next.js App
Router. It has three surfaces:

| Surface | Route | Notes |
| --- | --- | --- |
| Viewer site | `/` and `(main)` routes | Browse, search, title pages, watch, My List |
| Embeddable player | `/embed/[slug]` and `/embed/[slug]/trailer` | Iframe targets for partners |
| Admin backend | `/admin` | Auth-protected catalog, settings, staff and activity |

There is also a read-only public API at `/api/v1` used by partners, plus the
internal playback resolver at `/api/playback/[slug]`.

---

## 2. Stack and commands

- Next.js 16 (App Router, React 19, TypeScript)
- Tailwind CSS v4
- PostgreSQL with Drizzle ORM
- Better Auth for the admin backend
- Cloudflare Stream for optional uploads and signed playback
- TMDb for optional metadata, artwork and trailer lookups

Use `bun` for everything.

| Command | Purpose |
| --- | --- |
| `bun install` | Install dependencies |
| `bun run dev` | Start the dev server (port 4000 in the sandbox) |
| `bun run typecheck` | TypeScript check — run before every deploy |
| `bun run build` | Production build |
| `bun run db:generate` | Generate a migration after schema changes |
| `bun run db:migrate` | Apply migrations |
| `bun run db:seed` | Seed/refresh movies, genres and streams (idempotent) |
| `bun run tmdb:discover` | Write TMDb candidates to `data/tmdb-candidates.csv` |
| `bun run import:licensed` | Import licensed MP4 rows into the DB and catalog |

---

## 3. First run

```bash
bun install
cp .env.example .env          # then fill in the values
bun run db:migrate
bun run db:seed
bun run dev --port 4000
```

Open `http://localhost:4000`.

The seed is safe to re-run. It upserts by slug and does not duplicate rows.

---

## 4. Environment variables

Never commit `.env`. All secrets stay server-side.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes for admin/seed | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes for admin auth | Signs sessions |
| `NEXT_PUBLIC_SITE_URL` | Production | Canonical origin used by metadata, sitemap and docs |
| `DEVELOPER_API_KEYS` | To sell API access | Comma-separated partner keys |
| `TMDB_API_KEY` | Optional | TMDb v3 key (metadata only) |
| `TMDB_READ_ACCESS_TOKEN` | Optional | Preferred TMDb bearer token |
| `CLOUDFLARE_ACCOUNT_ID` | Optional | Cloudflare Stream account |
| `CLOUDFLARE_STREAM_API_TOKEN` | Optional | Uploads and asset management |
| `CLOUDFLARE_STREAM_SIGNING_KEY_ID` | Optional | Signed playback |
| `CLOUDFLARE_STREAM_SIGNING_KEY` | Optional | Signed playback |
| `CLOUDFLARE_STREAM_WEBHOOK_SECRET` | Optional | Webhook verification |

TMDb is used for metadata, posters, backdrops and trailer references. It never
provides full movies. Keep the required notice visible:

> This product uses the TMDB API but is not endorsed or certified by TMDB.

`TMDB_ATTRIBUTION` in `src/lib/video/tmdb.ts` is the single source of that text.
It is rendered in the footer and returned in API metadata.

---

## 5. Project map

```
src/
  app/
    (main)/                 viewer pages: home, movies, tv, live, title, watch,
                            search, my-list, about, contact, privacy, terms,
                            developers
    embed/[slug]/           iframe player
    embed/[slug]/trailer/   iframe trailer (movies only)
    api/playback/[slug]/    resolves a playable stream and enforces rights
    api/v1/titles/          public catalog list
    api/v1/titles/[slug]/   public catalog detail
    api/admin/              admin endpoints
    admin/                  admin UI
  components/familyflix/    viewer components
  lib/
    catalog.ts              merged in-memory catalog + home rows
    public-domain.ts        62 curated archive.org films
    imported.ts             reads imported-titles.json
    imported-titles.json    snapshot of licensed imports
    trailer.ts              TMDb trailer resolution + cache
    site.ts                 brand, contact and developer license config
    db/schema.ts            Drizzle tables and enums
    db/seed.ts              seed/upsert logic
    video/tmdb.ts           TMDb client
    video/cloudflare.ts     Stream client and signing
    api/                    API auth, rate limiting, serializers
scripts/
  tmdb-discover.ts          builds data/tmdb-candidates.csv
  import-licensed.ts        validates MP4 rows and imports them
drizzle/                    generated SQL migrations
data/                       working CSVs (not served)
```

---

## 6. How content works

The catalog is assembled in `src/lib/catalog.ts` from two sources:

1. **Public-domain films** — `src/lib/public-domain.ts`. Each entry points at a
   real `archive.org` MP4 and records its source and license.
2. **Licensed imports** — `src/lib/imported-titles.json`, produced by the
   importer. These also exist as `movies` + `video_assets` rows in PostgreSQL.

There are no bundled originals, series or live channels and no demo entries.
The catalog contains only real, playable content.

At the end of `catalog.ts`:

```ts
titles.push(...publicDomainFilms.map(toCatalogTitle), ...importedTitles);
```

Viewer pages read this in-memory catalog. They do **not** read PostgreSQL for
browsing. The database is used by the admin backend and by
`/api/playback/[slug]` to resolve and rights-check streams.

This split is intentional: browse pages stay fast and deployable, while
playback stays authoritative.

### Playback resolution order

`/api/playback/[slug]`:

1. Look up the movie in PostgreSQL by slug.
2. Reject if `status !== "published"`.
3. Reject if `licenseType === "unlicensed"`, `rightsConfirmedAt` is missing, or
   `licenseExpiresAt` has passed.
4. Read the `video_assets` row (must be `ready`, with an MP4 or HLS URL).
5. Sign the URL if Cloudflare signing is configured and required.
6. Return `{ hlsUrl, mp4Url, subtitles, posterUrl, signed, expiresIn }`.

If the database is unreachable, or no ready `video_assets` row exists, the
route returns `404`. There is no demo fallback: the player only ever streams a
real, licensed or public-domain source.

---

## 7. How to update without breaking the site

### Golden rules

- **Home rows are generated, not hand-curated.** `homeSections` in `catalog.ts`
  is built from the live `titles` array via `rankedSlugs` and genre filters, so
  rows shrink and grow automatically as titles change. Do not hardcode slugs.
- **Keep the `Title` shape stable.** Add optional fields instead of changing or
  removing existing ones.
- **Bump both sides of an import.** The importer writes the database row and
  `src/lib/imported-titles.json`. A DB-only change will not appear on browse
  pages, and a JSON-only change will not play.
- **Never edit an applied migration.** Add a new migration instead.
- **Run `bun run typecheck` before deploying.**

### Add or edit a public-domain film

1. Add an entry to `publicDomainFilms` in `src/lib/public-domain.ts` with a
   unique `slug`, `year`, `archiveId`, `mp4Url`, `sourceUrl`, `license` and
   `licenseUrl`.
2. Verify the MP4 resolves (must be a direct file, not a details page):

   ```bash
   curl -I "https://archive.org/download/<id>/<file>.mp4"
   ```

   It should return `200` and `content-type: video/mp4`.
3. Homepage rows are generated from `genres` and `score`, so a new film appears
   automatically with no slug list to edit.
4. Add it to the seed path if it should exist in PostgreSQL too. The seed
   already recognises every entry in `publicDomainFilms`.
5. Run `bun run db:seed`, then `bun run typecheck`.
6. Smoke-test `/title/<slug>` and `/embed/<slug>`.

Do not add a film just because it is old. Confirm its public-domain or
Creative-Commons status and keep the source link.

### Add licensed films (the normal pipeline)

Use this when you have a written license and a direct MP4 URL or CDN URL.

```bash
# 1. Generate candidates across trending, popular, top rated and decades
bun run tmdb:discover --pages=5 --out=data/tmdb-candidates.csv

# 2. Fill these columns for each title you have licensed:
#    mp4Url        direct https MP4 (Cloudflare, S3, Bunny, etc.)
#    licenseType   licensed | owned | public_domain | creative_commons
#    rightsHolder  who granted the rights
#    sourceUrl     contract or source reference (optional but recommended)

# 3. Import. Without --prune, existing imports are preserved.
bun run import:licensed --file=data/tmdb-candidates.csv

# 4. To replace the whole imported set:
bun run import:licensed --file=data/tmdb-candidates.csv --prune
```

The importer:

- Rejects missing, non-http(s) and duplicate `mp4Url` values.
- Resolves TMDb metadata by `tmdbId`, or by `title` + `year`.
- Generates a unique `slug` and writes `movies`, `genres`, `movie_genres` and
  `video_assets`.
- Sets `status: published`, `rightsConfirmedAt: now` and `provider: manual`.
- Rewrites `src/lib/imported-titles.json` so browse pages pick it up on the next
  build/redeploy.

Because the homepage reads the JSON at build time, **redeploy after importing**
in production. In local development the dev server hot-reloads the JSON.

### Add a series

The catalog has no bundled series. To add one, import a licensed title through
the admin importer (`/admin/import`) or `bun run import:licensed` with
`kind: series` (alias `type`) and a real stream URL. Series metadata supports
`seasons`. There is no live-channel pipeline yet; adding one requires schema and
import support.

### Database changes

```bash
# 1. Edit src/lib/db/schema.ts
bun run db:generate      # writes drizzle/000N_*.sql
# 2. Review the SQL before applying it
bun run db:migrate
bun run typecheck
```

Migrations are additive and safe to apply before deploying the new code. On
rollback, deploy the previous build; keep the new columns/table in place unless
you have verified they are unused.

### Deploy checklist

1. Set every required environment variable in the host.
2. `bun install`
3. `bun run db:migrate`
4. `bun run db:seed` (first deploy, or after adding public-domain films)
5. `bun run typecheck`
6. `bun run build`
7. Smoke-test:
   - `/` renders all home rows
   - `/movies`, `/tv-shows`, `/live`, `/search`
   - `/title/his-girl-friday`
   - `/watch/his-girl-friday` and `/embed/his-girl-friday`
   - `/api/v1/titles?limit=3`
   - `/developers`
   - `/robots.txt` and `/sitemap.xml`
8. Check the server log for TMDb 401s, database errors and stream errors.

**Rollback:** redeploy the previous build. Do not delete new migrations or
tables during an incident; the old code ignores them.

---

## 8. Player and trailer embeds

### Movie player

```
https://familyflix.demuregram.com/embed/{slug}
```

- Full-viewport ad-supported player.
- Calls `/api/playback/{slug}` for the stream.
- Shows a pre-roll ad with a skip button, then the movie.
- Saves resume position in `localStorage` under `familyflix:resume:{slug}`.
- `robots: noindex` so partner iframes never compete with the title page.

Because the player is a normal page, partners embed it with an iframe. Do not
put it behind an auth wall or the embed will break.

### Trailer

```
https://familyflix.demuregram.com/embed/{slug}/trailer
```

- Movies only; series and live return 404.
- Resolves the trailer through TMDb for imported titles (by stored `tmdbId`)
  and public-domain films (exact title + year).
- Caches hits for 24 hours and misses for 1 hour per server instance.
- Falls back to a branded "Trailer not available" panel with a link to the movie.

The trailer lookup never exposes the TMDb key to the browser.

### Iframe snippet

```html
<iframe
  src="https://familyflix.demuregram.com/embed/his-girl-friday"
  title="His Girl Friday on FamilyFlix"
  style="border:0;width:100%;aspect-ratio:16/9"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
  loading="lazy"
></iframe>
```

---

## 9. Public developer API

Public docs live at `/developers`. The contract is:

### Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/titles` | List/search the catalog |
| GET | `/api/v1/titles/{slug}` | One title + related titles |
| GET | `/api/playback/{slug}` | Resolve a playable stream |
| GET | `/embed/{slug}` | Player iframe |
| GET | `/embed/{slug}/trailer` | Trailer iframe |

### List parameters

`type` (`movie`, `series`, `live`), `genre`, `q`, `sort`
(`score`, `newest`, `oldest`, `name`), `limit` (1–100, default 24), `offset`.

### Authentication

- No key: public access, **30 requests/minute per IP**.
- `X-API-Key: <key>` or `Authorization: Bearer <key>`: licensed access,
  **120 requests/minute**.
- A supplied key that is not in `DEVELOPER_API_KEYS` returns `401` with
  `invalid_api_key`.

CORS is open for the catalog endpoints
(`Access-Control-Allow-Origin: *`, `GET` and `OPTIONS`), so browser clients can
call `/api/v1/titles` directly.

Rate limiting is best-effort and in-memory (`src/lib/api/rate-limit.ts`). If the
site runs on multiple instances or regions, add edge/Redis rate limiting. The
response headers already expose the contract:
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`,
`Retry-After`.

### Issuing a key

1. Agree the license and collect payment.
2. Generate a random key:

   ```bash
   openssl rand -hex 24
   ```

3. Add it to `DEVELOPER_API_KEYS` (comma-separated for multiple partners).
4. Redeploy/restart so the process picks up the new value.
5. Send the key to the partner over a secure channel.
6. Record which company owns which key in your billing system. The app does not
   store partner identities.

The key raises the limit and identifies a licensed integration. It does not
technically gate iframe embedding — compliance is contractual and documented on
`/developers` and `/terms#developer-api`.

### Commercial license

The one-time developer license is **$3,786.09 USD**, configured once in
`src/lib/site.ts`:

```ts
developer: {
  licenseFee: 3786.09,
  currency: "USD",
  licenseName: "FamilyFlix Developer License",
  ...
}
```

The price is rendered on `/developers`, included in the Terms, and exposed in
the Product JSON-LD and the API response metadata
(`meta.developerLicense`). Change it there, nowhere else.

Licensed partners may embed the player and trailer, display catalog metadata and
use the API on properties they operate. They may not download, re-host, proxy or
redistribute video files, strip branding/ads, or share keys.

---

## 10. Admin backend

`/admin` is protected by Better Auth. It manages movies, genres, video assets,
subtitles, site settings, staff accounts and the activity log. Every staff action
is written to `audit_logs`.

### Roles

The console has two staff roles. Roles and capabilities live in
`src/lib/admin/permissions.ts`; server routes call
`requireStaffApi(capability, request)` and pages call
`requireStaffPage(capability)`, so restrictions are enforced outside the UI.

| Capability | Administrator | Moderator |
| --- | --- | --- |
| View library, dashboard, activity | Yes | Yes |
| Create drafts, edit metadata, subtitles | Yes | Yes |
| TMDb search/import | Yes | Yes |
| Publish, archive or delete a title | Yes | No |
| Licensing and rights fields | Yes | No |
| Bulk import (CSV/JSON) | Yes | No |
| Attach, upload, sync or remove streams | Yes | No |
| Edit site settings | Yes | No (read-only) |
| Manage staff, roles, bans | Yes | No |
| Reset staff passwords | Yes | No |

The first account created becomes the administrator. Sign-ups are closed after
that: every other account is created at `/admin/staff`, and Better Auth's
user-create hook rejects self-service registration. Better Auth's admin plugin
only grants full plugin permissions to the `admin` role, so moderators cannot
use `/api/auth/admin/*` directly.

### Bulk import

Administrators import their own licensed catalog at `/admin/import`. The page
posts pasted CSV or JSON to `POST /api/admin/import`, which is served by
`src/lib/admin/import.ts`. Imports validate every row (title, synopsis, an
`mp4Url`/`hlsUrl` stream URL, `licenseType`, `rightsHolder`, and `sourceUrl`
unless the license is `owned`), optionally enrich missing metadata from TMDb,
and write `movies`, `movie_genres` and a ready `video_assets` row per title.
Imported titles publish immediately with `rightsConfirmedAt` set and are
recorded in `audit_logs` as `movie.import`.

- `GET /api/admin/import` returns the accepted columns, limits and a CSV template.
- `POST /api/admin/import` accepts `{ text, dryRun?, updateExisting? }`; `dryRun`
  validates without writing, and `updateExisting` replaces a matching slug.
- A successful import also rewrites `src/lib/imported-titles.json` so browse
  pages pick the titles up. Redeploy after importing.
- The importer enforces a 2000-row / 5 MB cap and lists at most 100 issues.

### Staff passwords

Passwords are set when an account is created at `/admin/staff`, and any
administrator (including the owner, on their own account) can rotate one from
the key icon on each staff row. The route calls Better Auth's
`auth.api.setUserPassword` and audits the change as `staff.password`.


### Moderator rate limits

Moderator writes and TMDb imports are throttled per account with the in-memory
limiter in `src/lib/api/rate-limit.ts`. Defaults are 40 metadata writes and 15
TMDb lookups per 10 minutes; an administrator can change both in **Settings →
Moderator rate limits**. For multi-instance deployments, add a shared limiter
(Redis/Upstash) at the same call site.

### Site settings

Settings are stored in the `site_settings` table as validated JSON
(`src/lib/admin/settings.ts`) and cached for 15 seconds. `saveSettings` clears
the cache and writes an audit entry. Wired settings include:

- Announcement banner and maintenance notice (`SiteNotice` + `/api/site-config`).
- Pre-roll ad on/off, length and skip time for `/embed/[slug]`.
- Trailer embed and developer API/embed switches.
- Moderator write/import limits.

Any new setting must be added to `siteSettingsSchema`, the form in
`src/components/admin/settings-form.tsx`, and the server code that reads it.

When attaching a stream in admin:

- Set `licenseType` to the real license, not `unlicensed`.
- Set `rightsHolder` and `sourceUrl`.
- Confirm `rightsConfirmedAt`.
- Set `licenseExpiresAt` if the rights are time-limited.
- Publish only when the asset is `ready`.

The playback route checks all of these before returning a stream.

---

## 11. Verification and QA

There is no automated test suite yet. Use these checks:

```bash
bun run typecheck
```

ESLint 10 is broken with the React plugin in this template. To lint, create a
temporary `eslint.config.lint.mjs` using `@next/eslint-plugin-next` and
`@typescript-eslint/*` (without the React plugin), run:

```bash
bun x eslint --config eslint.config.lint.mjs src scripts
```

then delete the temp config.

Runtime smoke test with headless Chrome or a browser:

1. Homepage: every row renders and no poster repeats inside a row.
2. `/title/his-girl-friday` → Play → ad plays → skip → video `readyState === 4`
   and `currentTime` advances.
3. `/embed/his-girl-friday` in an iframe on a different origin.
4. `/embed/his-girl-friday/trailer` returns a YouTube embed or the fallback.
5. `/api/v1/titles?limit=3` returns `data`, `pagination` and `meta`.
6. A bogus key returns `401`; a valid key raises the limit.
7. `/api/playback/<unlicensed-slug>` returns `403` when the title is unlicensed.

---

## 12. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Preview host returns 502 | Sandbox preview host changed | Use the current preview origin; do not hardcode it |
| Client chunks 403 in dev | Dev origin not allowed | Keep `*` in `allowedDevOrigins` and restart the dev server |
| TMDb 401 | Missing/wrong key | Check `TMDB_API_KEY` or `TMDB_READ_ACCESS_TOKEN` |
| Browse pages missing a new import | JSON snapshot not rebuilt | Redeploy after `import:licensed` |
| Title page 404s | Slug not in `catalog.ts` / JSON | Check the slug and the import output |
| Playback 403 | Unlicensed, missing rights confirmation, or expired | Fix the DB fields |
| Playback 404 | No `video_assets` row or asset not `ready` | Attach/transcode the stream |
| Trailer fallback | No exact TMDb match or no YouTube trailer | Expected; verify title + year |
| API 429 | Rate limit hit | Wait for `Retry-After` or use a licensed key |
| Seed fails | `DATABASE_URL` missing | Set it and re-run `bun run db:seed` |

Archive.org playback needs the direct `/download/` file URL. The `/details/`
page is HTML and will not play.

---

## 13. Legal guardrails (must read)

These are not optional.

- **Never integrate YTS, torrents, magnet links or any unlicensed source.**
  Requests to scrape `movies-api.accel.li` or similar must be refused, even if
  the requester claims to own the content. There is no written license on file.
- Only add full movies when they are public domain, Creative Commons, owned by
  FamilyFlix, or covered by a written license with a direct playback URL.
- Record `rightsHolder`, `sourceUrl`, `licenseType` and `rightsConfirmedAt` for
  every licensed title.
- Keep `licenseExpiresAt` current. The playback route blocks expired rights.
- Keep the TMDb attribution visible. Never expose TMDb credentials client-side.
- Do not let the public API become a download or re-hosting service. Playback
  URLs are for the player, not for redistribution.
- Review the Terms and Privacy pages with counsel before selling developer
  licenses at scale.

---

## 14. Handoff checklist

- [ ] Transfer or grant access to the domain, DNS and hosting account.
- [ ] Transfer the PostgreSQL database and confirm backups.
- [ ] Transfer the Cloudflare account (Stream, R2/CDN if used).
- [ ] Transfer the TMDb account and rotate the API credentials.
- [ ] Transfer the mailboxes: support, legal, privacy, press, developers.
- [ ] Rotate every secret in `.env` and update the production environment.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the production origin.
- [ ] Add at least one key to `DEVELOPER_API_KEYS` before selling access.
- [ ] Confirm the $3,786.09 fee, currency and refund policy with the business.
- [ ] Run the deploy checklist and the playback smoke test.
- [ ] Confirm the preview/iframe host settings with the new host.
- [ ] Read section 13 before touching the catalog.
