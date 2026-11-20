# FamilyFlix movie archive imports

The archive importer adds catalog metadata to private draft records. It does not establish ownership, a Creative Commons license, or permission to distribute a movie.

## Import workflow

1. Open **Studio → Import titles** and choose the supplied `.zip` file.
2. Run **Dry run**. The report lists archive pages, unique records, matching and new titles, duplicates, malformed pages, recovered records, protected titles, and expected source rows.
3. Review the report, then choose **Import private metadata**.
4. The import saves progress after each batch. The recent-jobs list shows page and record counts.
5. If the API server restarts, the job is marked paused. Re-select the exact same ZIP and choose **Resume with selected ZIP**. The server verifies its SHA-256 digest and continues from the saved page cursor.

The server keeps no copy of the uploaded ZIP. Dry runs create a validation job and audit event, but do not create movie, catalog-source, torrent-source, rights, or playback records.

## Source and playback boundaries

- New movie records are `draft` and `unlicensed`, with no poster, backdrop, rights record, or video asset.
- Existing published, licensed, or rights-documented records are not overwritten.
- Original catalog metadata is kept in a separate internal source table. Torrent records are stored separately with `playbackStatus: disabled` and `rightsStatus: unverified`.
- Catalog and torrent URLs are returned only by an admin-capability endpoint. They are not public catalog data and are never sent to the video player.
- Public playback still requires independently verified rights evidence, an authorized supported stream, review, and explicit publication.
- The archive checksum has one import-job record, and source/torrent rows are uniquely keyed so repeat validation or processing cannot create duplicate jobs or source rows. The job records its page cursor; after a restart, the same file must be uploaded again.
- Only `movies/movies_page_N.json` entries are processed. Other archive files are ignored; the README is never executed.

## Supplied archive dry-run facts

The supplied ZIP is about 10.3 MB and contains 1,169 movie JSON pages. The parser finds 23,285 unique source records, 88 repeated source IDs, no repeated IMDb IDs, one malformed page with 13 recovered complete records, and 51,915 torrent references. One source record has no usable title and receives a private placeholder name. These records are not cleared for public display or playback.

## Development import report

The development import completed successfully:

| Measure | Result |
| --- | ---: |
| Pages processed | 1,169 / 1,169 |
| Unique records processed | 23,285 |
| Source metadata records imported | 23,285 |
| Existing catalog titles matched | 23,285 |
| New titles created / existing titles updated | 0 / 0 |
| Torrent references imported | 51,915 |
| Duplicate source IDs / duplicate IMDb IDs | 88 / 0 |
| Malformed pages / recovered complete records | 1 / 13 |
| Records skipped / failed | 0 / 0 |
| Records with all 18 requested metadata fields present | 22,705 |
| Records missing at least one requested field | 580 |
| Titles awaiting rights and playback-source review | 23,285 |
| Verified streaming rights / ready authorized streams | 0 / 0 |

“All 18 metadata fields present” means the source record includes each expected field key; some source values may still be empty. All available whitelisted metadata remains private and linked to its existing catalog draft. Every torrent reference remains disabled and unverified.

The public catalog returned no imported titles, and a known imported draft returned 404 from both its public detail and playback endpoints. That confirms the ZIP did not make drafts or torrent links public. The admin-only import and source panels are implemented and typechecked, but their signed-in UI could not be visually exercised in the unauthenticated preview. No authorized sample stream was supplied, so playback with licensed media has not been tested.

## Development and production

Schema changes are additive and were applied to the development database for verification. No production titles or source records were written and the app has not been published. To roll back this development change, restore a workspace checkpoint from before the importer work; this avoids manually deleting shared catalog rows. If the app is published later, the production schema change is additive, and an administrator must run the importer separately if they want these private records in production.

Run the parser and policy tests with:

```sh
pnpm --filter @workspace/api-server run test
```
