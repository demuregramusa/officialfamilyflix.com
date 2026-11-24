# FamilyFlix By DemureGram — Backend Admin API, Importer Engine & Database Interfaces

> **GitHub Repository:** `https://github.com/demuregramusa/officialfamilyflix.com.git` (branches: `main`, `development`)  
> **Live Production Base URL:** `https://familyflix.demuregram.com`  
> **Admin API Mount Prefix:** `/api/admin/*` (mounted on Express router at `/api`)

---

## 1. Repository & Package Structure

- `lib/db/src/schema/familyflix.ts` (`@workspace/db`): Drizzle ORM PostgreSQL schema (`movies`, `media_rights`, `video_assets`, `imported_movie_sources`, `imported_torrent_sources`, `archive_import_jobs`, `series_seasons`, `series_episodes`, `genres`, `movie_genres`, `subtitles`).
- `lib/api-zod/src/generated/api.ts` (`@workspace/api-zod`): Orval-generated Zod v4 validation schemas for every Admin and Public API endpoint.
- `artifacts/api-server/src/routes/admin-titles.ts`: Title creation, metadata update, rights review, stream attachment, Cloudflare Stream direct upload/sync, and publishing (`/api/admin/titles/*`).
- `artifacts/api-server/src/routes/admin-content.ts`: Bulk CSV/JSON title & rights importer (`POST /api/admin/import`), rights asset CRUD, and subtitle CRUD.
- `artifacts/api-server/src/routes/admin-movie-archive.ts`: ZIP catalog archive validator & batch importer (`/api/admin/import/archive/*`), torrent rights review, and torrent playback activation.
- `artifacts/api-server/src/routes/series-episodes.ts`: TV series season/episode batch JSON importer (`POST /api/admin/titles/:id/episodes`), episode rights review, and episode publishing.
- `artifacts/api-server/src/lib/movie-archive-import.ts` & `movie-archive-parser.ts`: Paginated ZIP (`movies/movies_page_N.json`) parser and transactional batch importer.
- `artifacts/api-server/src/lib/rights.ts`: Chain-of-title validation, Creative Commons canonical URL verification, and SSRF-safe direct HTTPS media probing (`checkDirectMediaSource`).
- `artifacts/api-server/src/lib/catalog.ts` & `catalog-service.ts`: Eligibility rules, $O(1)$ in-memory catalog cache, and playback manifest resolution.

---

## 2. Authentication & RBAC Capabilities

All `/api/admin/*` routes authenticate via **Better Auth** session cookies (`better-auth.session_token`) verified by `auth.api.getSession({ headers: fromNodeHeaders(request.headers) })` in `artifacts/api-server/src/lib/auth-middleware.ts`.

- Required user role: `user.role = "admin"` (grants all capabilities) or `"moderator"`.
- Capabilities enforced by `requireCapability(capability)`:
  - `library.view`, `library.create`, `library.edit`, `library.publish`, `library.import`, `library.delete`
  - `rights.manage`, `stream.view`, `stream.manage`, `subtitle.manage`

---

## 3. Complete Admin API Endpoints & Payloads

### A. Single Title Creation, Rights Review, Stream Binding & Publishing (`admin-titles.ts`)

#### 1. `POST /api/admin/titles` (Capability: `rights.manage`)
Creates a `draft` movie/series record in `movies`, inserts its `media_rights` rows (`review_status = 'pending'`), links `genres`/`movie_genres`, and optionally attaches a `video_assets` stream (probed via HTTP `Range: bytes=0-0` for `200/206` + `video/mp4` or HLS MIME type).

**Request Body (`CreateAdminTitleBody`):**
```json
{
  "name": "Night of the Living Dead",
  "kind": "movie",
  "synopsis": "A group of people hide from bloodthirsty zombies in a farmhouse.",
  "year": 1968,
  "tagline": "They won't stay dead!",
  "creatorAttribution": "George A. Romero / Image Ten",
  "rating": "R",
  "durationMinutes": 96,
  "genres": ["Horror", "Classics", "Thriller"],
  "cast": ["Duane Jones", "Judith O'Dea"],
  "featured": true,
  "posterUrl": "https://archive.org/download/night_of_the_living_dead/poster.jpg",
  "backdropUrl": "https://archive.org/download/night_of_the_living_dead/backdrop.jpg",
  "stream": {
    "provider": "manual",
    "mp4Url": "https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead.mp4",
    "hlsUrl": null,
    "signedPlayback": false
  },
  "rights": [
    {
      "assetKind": "main-video",
      "assetLabel": "Main Theatrical Feature MP4",
      "assetUrl": "https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead.mp4",
      "rightsHolder": "Public Domain",
      "creatorAttribution": "George A. Romero / Image Ten (1968)",
      "licenseType": "public-domain",
      "licenseVersion": "1.0",
      "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
      "usageRestrictions": [],
      "sourceUrl": "https://archive.org/details/night_of_the_living_dead",
      "evidenceUrl": "https://archive.org/details/night_of_the_living_dead",
      "evidenceNotes": "Entered public domain in the US due to omission of copyright notice on theatrical prints.",
      "territory": "Worldwide",
      "expiresAt": null,
      "uploaderAttested": true
    },
    {
      "assetKind": "poster",
      "assetLabel": "Official Poster",
      "assetUrl": "https://archive.org/download/night_of_the_living_dead/poster.jpg",
      "rightsHolder": "Public Domain",
      "creatorAttribution": "Image Ten",
      "licenseType": "public-domain",
      "licenseVersion": "1.0",
      "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
      "usageRestrictions": [],
      "sourceUrl": "https://archive.org/details/night_of_the_living_dead",
      "evidenceUrl": "https://archive.org/details/night_of_the_living_dead",
      "evidenceNotes": "Public domain theatrical poster artwork.",
      "territory": "Worldwide",
      "expiresAt": null,
      "uploaderAttested": true
    },
    {
      "assetKind": "backdrop",
      "assetLabel": "Official Backdrop",
      "assetUrl": "https://archive.org/download/night_of_the_living_dead/backdrop.jpg",
      "rightsHolder": "Public Domain",
      "creatorAttribution": "Image Ten",
      "licenseType": "public-domain",
      "licenseVersion": "1.0",
      "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
      "usageRestrictions": [],
      "sourceUrl": "https://archive.org/details/night_of_the_living_dead",
      "evidenceUrl": "https://archive.org/details/night_of_the_living_dead",
      "evidenceNotes": "Public domain still frame.",
      "territory": "Worldwide",
      "expiresAt": null,
      "uploaderAttested": true
    }
  ],
  "uploaderAttested": true
}
```

> **Important Validation Rules (`admin-titles.ts` & `rights.ts`):**
> 1. Every title must include **exactly one** `assetKind: "main-video"` rights record.
> 2. If `posterUrl` or `backdropUrl` is provided, there **must** be a matching `rights` entry with `assetKind: "poster"` / `"backdrop"` whose `assetUrl` equals `posterUrl` / `backdropUrl`.
> 3. For `licenseType` in `["public-domain", "creator-owned", "authorized-copyright"]`, `evidenceNotes` is **mandatory** (non-empty string).
> 4. For Creative Commons licenses (`"cc-by-4.0"`, `"cc-by-sa-4.0"`, `"cc0-1.0"`, etc.), `licenseUrl` must match the canonical Creative Commons URL (e.g., `https://creativecommons.org/licenses/by/4.0/` or `https://creativecommons.org/publicdomain/zero/1.0/`) and `licenseVersion` must match (`"4.0"` or `"1.0"`).

#### 2. `POST /api/admin/titles/:id/review` (Capability: `rights.manage`)
Approves, rejects, restricts, or restores the `media_rights` records for a title.
```json
{
  "decision": "approve",
  "note": "Verified chain-of-title and public domain status.",
  "rightsIds": [
    "uuid-of-main-video-right",
    "uuid-of-poster-right",
    "uuid-of-backdrop-right"
  ]
}
```

#### 3. `PUT /api/admin/titles/:id/stream` (Capability: `stream.manage`)
Attaches or updates a direct MP4/HLS or Cloudflare stream on `video_assets` (note: resets `main_video` right `review_status` to `pending` and title `status` to `draft`, so call `/stream` **before** `/review` and `/publish`).
```json
{
  "provider": "manual",
  "mp4Url": "https://archive.org/download/example/movie.mp4",
  "hlsUrl": null,
  "playbackId": null,
  "signedPlayback": false
}
```

#### 4. `POST /api/admin/titles/:id/publish` (Capability: `library.publish`)
Verifies that all `media_rights` records for the title have `reviewStatus === "approved"` and complete evidence, and that the title has either:
- A `ready` row in `video_assets` linked to the `main_video` right, **OR**
- An `active` + `approved` row in `imported_torrent_sources`, **OR**
- `kind === "series"` (where episodes are published individually).
Then sets `movies.status = 'published'` and `movies.published_at = NOW()`.

---

### B. Bulk JSON / CSV Title Importer (`POST /api/admin/import` in `admin-content.ts`)

Imports an array of `CreateAdminTitleBody` objects (JSON format) or flattened CSV rows in a single call.
- **Endpoint:** `POST /api/admin/import` (Capability: `library.import`)
- **Max Payload String Size:** `5,242,880` bytes (5 MB per batch request)

**Request Body (`ImportTitlesBody`):**
```json
{
  "format": "json",
  "dryRun": false,
  "updateExisting": true,
  "uploaderAttested": true,
  "payload": "[{ ...CreateAdminTitleBody_1 }, { ...CreateAdminTitleBody_2 }]"
}
```

**Response (`ImportTitlesResponse`):**
```json
{
  "dryRun": false,
  "total": 50,
  "created": 48,
  "updated": 2,
  "skipped": 0,
  "issues": [],
  "pendingReview": 150
}
```
*(After importing drafts via `POST /api/admin/import`, iterate the created title IDs and call `POST /api/admin/titles/:id/review` -> `POST /api/admin/titles/:id/publish` to publish them through the official workflow.)*

---

### C. TV Series Seasons & Episodes Importer (`series-episodes.ts`)

1. **Create & Publish the Parent Series:**
   - Call `POST /api/admin/titles` with `kind: "series"` and a `main-video` rights record.
   - Call `POST /api/admin/titles/:seriesId/review` (`decision: "approve"`).
   - Call `POST /api/admin/titles/:seriesId/publish`.
2. **Batch Import Seasons & Episodes:**
   - **Endpoint:** `POST /api/admin/titles/:id/episodes` (Capability: `rights.manage`)
   - **Important Rule:** Each episode's `stream.url` must be a direct `https://...mp4` or `.m3u8` URL and **must exactly match** `episode.rights.assetUrl`.

**Request Body (`ImportAdminSeriesEpisodesBody`):**
```json
{
  "uploaderAttested": true,
  "seasons": [
    {
      "seasonNumber": 1,
      "name": "Season 1",
      "episodes": [
        {
          "episodeNumber": 1,
          "name": "Pilot Episode",
          "synopsis": "Episode 1 synopsis...",
          "durationMinutes": 45,
          "stream": {
            "url": "https://archive.org/download/example-series/s01e01.mp4"
          },
          "rights": {
            "assetKind": "main-video",
            "assetLabel": "S01E01 Main Video",
            "assetUrl": "https://archive.org/download/example-series/s01e01.mp4",
            "rightsHolder": "Public Domain",
            "creatorAttribution": "Classic TV Archive",
            "licenseType": "public-domain",
            "licenseVersion": "1.0",
            "licenseUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
            "usageRestrictions": [],
            "sourceUrl": "https://archive.org/details/example-series",
            "evidenceUrl": "https://archive.org/details/example-series",
            "evidenceNotes": "Verified public domain broadcast.",
            "territory": "Worldwide",
            "expiresAt": null,
            "uploaderAttested": true
          }
        }
      ]
    }
  ]
}
```
3. **Approve & Publish Each Episode:**
   - `POST /api/admin/episodes/:episodeId/review` with `{ "decision": "approve", "note": "Approved episode rights." }`
   - `POST /api/admin/episodes/:episodeId/publish`

---

### D. ZIP Archive & Torrent Source Importer (`admin-movie-archive.ts`)

For importing YTS/Archive ZIP catalogs containing `movies/movies_page_<N>.json` (`{ "data": { "movies": [ ... ] } }`):

1. **Validate ZIP Archive:**
   - `POST /api/admin/import/archive/validate`
   - Headers: `Content-Type: application/zip`, `x-archive-name: movie-catalog.zip`
   - Body: Raw binary ZIP buffer (`<= 20 MB` compressed, `<= 120 MB` uncompressed, up to `100,000` records).
   - Returns `ArchiveValidationReport` containing `job.id`.
2. **Start/Resume Batch Import Job:**
   - `POST /api/admin/import/archive-jobs/:jobId/start`
   - Headers: `Content-Type: application/zip`
   - Body: Exact same raw binary ZIP buffer (verified by SHA-256).
   - Populates `movies`, `imported_movie_sources`, `imported_torrent_sources`, `genres`, and `movie_genres` in batches of 25 pages.
3. **Poll Job Progress:**
   - `GET /api/admin/import/archive-jobs/:jobId`
4. **Inspect Imported Torrent Sources for a Title:**
   - `GET /api/admin/titles/:id/archive-sources`
5. **Approve Torrent Source Distribution Rights:**
   - `PATCH /api/admin/titles/:id/archive-torrents/:torrentId/rights-review`
   ```json
   {
     "decision": "approve",
     "evidenceUrl": "https://creativecommons.org/publicdomain/mark/1.0/",
     "evidenceNotes": "Verified authorized/public-domain distribution rights for this torrent source.",
     "reviewerNote": "Approved for WebTorrent gateway playback."
   }
   ```
6. **Activate Torrent Source Playback:**
   - `PATCH /api/admin/titles/:id/archive-torrents/:torrentId/playback`
   ```json
   {
     "active": true
   }
   ```
7. **Approve Title `media_rights` & Publish:**
   - Ensure the title has an approved `main_video` row in `media_rights`, then call `POST /api/admin/titles/:id/publish`.

---

## 4. Exact Drizzle ORM Database Schema (`lib/db/src/schema/familyflix.ts`)

| Table Name | Primary Key | Key Columns & Constraints |
| :--- | :--- | :--- |
| `movies` | `id` (`uuid`) | `slug` (`unique`), `name`, `kind` (`'movie' \| 'series' \| 'live'`), `tagline`, `synopsis`, `year`, `rating`, `score`, `duration_minutes`, `poster_url`, `backdrop_url`, `cast` (`jsonb`), `creator_attribution`, `featured`, `status` (`'draft' \| 'published' \| 'archived'`), `published_at`, `license_type` |
| `media_rights` | `id` (`uuid`) | `movie_id` (`uuid nullable`), `episode_id` (`uuid nullable`), `asset_kind` (`'main_video' \| 'poster' \| 'backdrop' \| 'subtitle' ...`), `asset_label`, `asset_url`, `rights_holder`, `creator_attribution`, `license_type`, `license_version`, `license_url`, `source_url`, `evidence_url`, `evidence_notes`, `uploader_attested` (`boolean`), `review_status` (`'pending' \| 'approved' \| 'rejected' \| 'restricted'`). Constraint: `num_nonnulls(movie_id, episode_id) = 1` |
| `video_assets` | `id` (`uuid`) | `movie_id` (`unique uuid nullable`), `episode_id` (`unique uuid nullable`), `media_right_id` (`uuid`), `provider` (`'manual' \| 'cloudflare' \| 'demo'`), `mp4_url`, `hls_url`, `playback_id`, `status` (`'pending_upload' \| 'processing' \| 'ready' \| 'error' \| 'disabled'`), `signed_playback` (`boolean`). Constraint: `num_nonnulls(movie_id, episode_id) = 1` |
| `imported_movie_sources` | `id` (`uuid`) | `movie_id` (`uuid`), `import_job_id` (`uuid`), `provider` (`'yts'`), `source_id`, `imdb_code`, `source_url`, `metadata` (`jsonb`). Unique: `(provider, source_id)` |
| `imported_torrent_sources` | `id` (`uuid`) | `movie_source_id` (`uuid`), `source_index` (`int`), `source_url`, `info_hash`, `quality`, `source_type`, `video_codec`, `seeders`, `peers`, `size`, `size_bytes`, `playback_status` (`'disabled' \| 'active'`), `rights_status` (`'unverified' \| 'approved' \| 'rejected' \| 'restricted'`), `rights_evidence_url`, `rights_evidence_notes` |
| `series_seasons` | `id` (`uuid`) | `movie_id` (`uuid`), `season_number` (`int > 0`), `name`. Unique: `(movie_id, season_number)` |
| `series_episodes` | `id` (`uuid`) | `season_id` (`uuid`), `episode_number` (`int > 0`), `name`, `synopsis`, `duration_minutes`, `status` (`'draft' \| 'published' \| 'archived'`), `published_at`. Unique: `(season_id, episode_number)` |
| `genres` & `movie_genres` | `id` (`serial`) / `(movie_id, genre_id)` | `genres.name`, `genres.slug` (`unique`); joined via `movie_genres(movie_id, genre_id)` |
