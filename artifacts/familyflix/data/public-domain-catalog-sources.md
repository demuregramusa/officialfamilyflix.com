# FamilyFlix public-domain starter pack

Checked on 2026-11-20. The three import candidates below use NASA's own catalog records and direct MP4 derivatives hosted on NASA's media server. Each MP4 was checked with an HTTP `HEAD` request; NASA returned `200` with `Content-Type: video/mp4`.

## Rights basis and review boundary

- The item records identify NASA as the photographer for all three videos.
- NASA's [media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) say NASA content is generally not subject to U.S. copyright, require NASA source attribution, and warn that some NASA pages contain separately copyrighted third-party material.
- The proposed U.S. public-domain basis is 17 U.S.C. §105: [official U.S. Code text](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title17-section105&num=0&edition=prelim).
- This is a U.S.-only basis, not a worldwide rights conclusion. NASA marks, endorsement, and any separately copyrighted excerpts remain outside the claim.
- The source records do not themselves certify that every audiovisual element is free of third-party rights. An administrator must inspect the complete video, confirm its federal-work basis and suitability for the service, approve the rights record, and then explicitly publish the title. The import pack never publishes automatically.

## Individual records

| Title | NASA item record | NASA media collection | Direct MP4 |
| --- | --- | --- | --- |
| Apollo 11 Moonwalk Montage | [NASA API record](https://images-api.nasa.gov/search?nasa_id=Apollo_11_moonwalk_montage_720p&media_type=video) — two-minute moonwalk montage; photographer NASA | [NASA collection](https://images-assets.nasa.gov/video/Apollo_11_moonwalk_montage_720p/collection.json) | [Small MP4](https://images-assets.nasa.gov/video/Apollo_11_moonwalk_montage_720p/Apollo_11_moonwalk_montage_720p~small.mp4) |
| Apollo 12: Pinpoint for Science | [NASA API record](https://images-api.nasa.gov/search?nasa_id=KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425&media_type=video) — 1969, 28-minute color film; photographer NASA | [NASA collection](https://images-assets.nasa.gov/video/KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425/collection.json) | [Small MP4](https://images-assets.nasa.gov/video/KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425/KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425~small.mp4) |
| Apollo 12 Mission Summary and Highlights | [NASA API record](https://images-api.nasa.gov/search?nasa_id=KSC-1969-MH-NAS01-0001-Apollo_12_Mission_Summary_Highlights_Splashdown_with_President_Nixon-HM_3599&media_type=video) — Apollo 12 pre-launch through recovery; photographer NASA | [NASA collection](https://images-assets.nasa.gov/video/KSC-1969-MH-NAS01-0001-Apollo_12_Mission_Summary_Highlights_Splashdown_with_President_Nixon-HM_3599/collection.json) | [Small MP4](https://images-assets.nasa.gov/video/KSC-1969-MH-NAS01-0001-Apollo_12_Mission_Summary_Highlights_Splashdown_with_President_Nixon-HM_3599/KSC-1969-MH-NAS01-0001-Apollo_12_Mission_Summary_Highlights_Splashdown_with_President_Nixon-HM_3599~small.mp4) |

The ready-to-load records are in `src/lib/curated-public-domain-titles.ts`. The Import Titles page has a **Load NASA starter pack** button. It selects JSON and restores dry-run mode before any import action.
