# FamilyFlix By DemureGram — Movies & TV Shows JSON Catalog & Playback Architecture (Read-Only Developer Reference)

> **Status:** Read-Only Protected Reference (`IsReadOnly = true`)  
> **Total Published Titles:** 23,272 (`23,163` Movies + `109` TV Series / Specials)

---

## 1. Exported JSON Catalog Files

All three JSON catalog files are generated from the live PostgreSQL database and marked **Read-Only**:

| File | Size | Description | Live Download URL |
| :--- | :--- | :--- | :--- |
| [`familyflix-full-catalog-movies-and-tv-shows.json`](./familyflix-full-catalog-movies-and-tv-shows.json) | `46.49 MB` | Complete 23,272-title catalog (all 23,163 movies + 109 TV series, seasons, episodes, posters, and playback bindings) | `https://familyflix.demuregram.com/familyflix-full-catalog-movies-and-tv-shows.json` |
| [`familyflix-tv-shows-catalog.json`](./familyflix-tv-shows-catalog.json) | `0.32 MB` | All 109 TV series & specials with their complete season/episode hierarchy and episode playback endpoints | `https://familyflix.demuregram.com/familyflix-tv-shows-catalog.json` |
| [`familyflix-developer-catalog-blueprint.json`](./familyflix-developer-catalog-blueprint.json) | `0.06 MB` | Compact developer blueprint containing architecture notes, sample movies, and sample TV series with episodes | `https://familyflix.demuregram.com/familyflix-developer-catalog-blueprint.json` |

---

## 2. Database & In-Memory Turbo Cache Architecture

1. **PostgreSQL Schema ([`scripts/setup-db.sql`](./scripts/setup-db.sql)):**
   - `movies`: Core catalog table storing both movies (`kind = 'movie'`) and TV series (`kind = 'series'`), slug, year, rating, score, duration, poster/backdrop URLs, and synopsis.
   - `genres` & `movie_genres`: Many-to-many genre classification across 44 main categories and 20 subgenres.
   - `series_seasons` & `series_episodes`: Hierarchical season and episode records linked to parent `movies.id` where `kind = 'series'`.
   - `video_assets`: Direct MP4/HLS/Cloudflare stream assets linked to either `movie_id` or `episode_id`.
   - `imported_movie_sources` & `imported_torrent_sources`: Approved archive and P2P/WebTorrent metadata (`info_hash`, `quality`, `video_codec`, `seeders`, `source_url`).
   - `media_rights`: Chain-of-title and licensing records (`public_domain`, `cc_by_4_0`, `cc0_1_0`, `authorized`, etc.).

2. **$O(1)$ In-Memory Catalog Service ([`artifacts/api-server/src/lib/catalog-service.ts`](./artifacts/api-server/src/lib/catalog-service.ts)):**
   - On server startup, `CatalogService` pre-loads all 23,272 published titles into memory (`titlesById`, `titlesBySlug`) and pre-computes all 22 homepage curated collection rows (`cachedCuratedRows`) and hero spotlight items (`cachedHeroTitles`).
   - Stale-While-Revalidate refreshes run asynchronously in the background so user requests resolve in `< 10ms`.

3. **Streaming & Playback Engine ([`artifacts/api-server/src/lib/catalog.ts`](./artifacts/api-server/src/lib/catalog.ts) & [`torrent-playback.ts`](./artifacts/api-server/src/lib/torrent-playback.ts)):**
   - **Manifest Resolution:** `GET /api/playback/:slug` (and `GET /api/playback/:slug/episodes/:episodeId`) resolves the active playback source (`hls`, direct `mp4`, or `/api/playback/:slug/media`).
   - **HTTP 206 Byte-Range Media Gateway:** `GET /api/playback/:slug/media` opens the approved `.torrent` / media stream, prioritizes the initial (`startP..startP+5`) and tail (`endP-1..endP`) MP4 atoms (`moov` header) via 2-argument `torrent.critical(start, end)`, and streams standard `video/mp4` byte ranges (`206 Partial Content`) to the `<video>` element.

---

## 3. Sample JSON Schema (Movie & TV Series Record)

```json
{
  "id": "8b816019-7b17-4ce0-93b4-2fdcb3f3d916",
  "slug": "a-ghost-at-gilmore-house-2027",
  "name": "A Ghost at Gilmore House",
  "kind": "movie",
  "year": 2027,
  "rating": "PG",
  "score": 70,
  "durationMinutes": 93,
  "tagline": "A school project leads a teenage girl into a fifty-year-old murder mystery—and secrets that were never meant to be uncovered.",
  "synopsis": "A school project leads a teenage girl into a fifty-year-old murder mystery—and secrets that were never meant to be uncovered.",
  "genres": ["Horror", "Mystery", "Thriller"],
  "cast": [],
  "creatorAttribution": "A Ghost at Gilmore House (2027)",
  "featured": false,
  "posterUrl": "https://img.yts.pw/assets/images/movies/a_ghost_at_gilmore_house_2027/medium-cover.jpg",
  "backdropUrl": "https://img.yts.pw/assets/images/movies/a_ghost_at_gilmore_house_2027/background.jpg",
  "urls": {
    "detailPage": "/titles/a-ghost-at-gilmore-house-2027",
    "watchPage": "/watch/a-ghost-at-gilmore-house-2027",
    "detailApi": "/api/v1/titles/a-ghost-at-gilmore-house-2027",
    "playbackApi": "/api/playback/a-ghost-at-gilmore-house-2027",
    "mediaStreamUrl": "/api/playback/a-ghost-at-gilmore-house-2027/media"
  },
  "playbackSource": {
    "streamType": "mp4",
    "directMp4Url": null,
    "hlsUrl": null,
    "torrentGateway": {
      "imdbCode": "tt45369775",
      "infoHash": "1C7368949B0F8C300B5B83442BB8DC0FFACA9A3A",
      "quality": "720p",
      "sourceType": "web",
      "videoCodec": "x264",
      "size": "881.82 MB",
      "sizeBytes": 924655288,
      "seeders": 24,
      "peers": 13,
      "sourceUrl": "https://yts.pw/torrent/download/1C7368949B0F8C300B5B83442BB8DC0FFACA9A3A",
      "magnetUrl": "magnet:?xt=urn:btih:1C7368949B0F8C300B5B83442BB8DC0FFACA9A3A&dn=A%20Ghost%20at%20Gilmore%20House",
      "gatewayStreamEndpoint": "/api/playback/a-ghost-at-gilmore-house-2027/media"
    }
  }
}
```
