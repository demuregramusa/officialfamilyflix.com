# FamilyFlix public-domain starter pack

Checked on 2026-11-20. **No NASA title is cleared for import or publication.**
The three candidates previously listed here have been removed from the
loadable starter pack. This is a finding that the available evidence is
insufficient—not a conclusion that the works are infringing or that all of
their contents are protected.

## Library of Congress titles prepared for dry-run import

The following three individually checked item records are included in the
administrator-only starter pack. Each LOC item record explicitly states that
the contents of the *Before and After the Great Earthquake and Fire: Early
Films of San Francisco, 1897 to 1916* collection are in the public domain and
free to use and reuse. Each source labels the film as silent, identifies its
date, and links to the digital viewing copy used below. The collection notice
is the documented U.S. public-domain basis; FamilyFlix makes no claim about
copyright status in other territories.

The item records give this credit line:

> Library of Congress, Motion Picture, Broadcasting, and Recorded Sound
> Division, Before and After the Great Earthquake and Fire: Early Films of San
> Francisco, 1897 to 1916 Collection.

| Title | Item record and documented evidence | Direct HLS source | Rights and known limits |
| --- | --- | --- | --- |
| A trip down Market Street before the fire (1906) | [LOC item 00694408](https://www.loc.gov/item/00694408/). The record dates the film to 1906, credits Miles Brothers, classifies it as a silent film, and contains the collection-level public-domain/free-reuse statement. It says it was filmed April 14, 1906. | `https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:00015143:00015143/full/full/0/full/default.m3u8` | U.S. status only. Use the LOC credit line. LOC advises users to assess separate privacy, publicity, trademark, and other rights. The source's exact audiovisual contents have not been independently audited by FamilyFlix. |
| San Francisco earthquake and fire, April 18, 1906 | [LOC item 00694425](https://www.loc.gov/item/00694425/). The record dates the silent film to 1906, says it was photographed in San Francisco and Oakland in early May, and contains the collection-level public-domain/free-reuse statement. The record does not identify the filmmaker. | `https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:00007947:00007947/full/full/0/full/default.m3u8` | U.S. status only. Use the LOC credit line. The item record warns that some title cards are sensationalized and that one family scene may have been staged; LOC also advises assessment of separate privacy, publicity, trademark, and other rights. |
| TR in San Francisco, 1903 | [LOC item 00694419](https://www.loc.gov/item/00694419/). The record dates the silent film to 1903, describes Roosevelt's visit, and contains the collection-level public-domain/free-reuse statement. The filmmaker is not identified; LOC notes it may include footage from May 12 and May 13. | `https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:01877808:01877808/full/full/0/full/default.m3u8` | U.S. status only. Use the LOC credit line. LOC advises assessment of separate privacy, publicity, trademark, and other rights. |

On 2026-11-20, each HLS master playlist and its 540p variant returned HTTP 200;
the first media segment for each variant also returned HTTP 200 with a
`video/MP2T` content type. The direct source URLs remain in the API server's
curated manifest; the browser bundle contains only title, year, and LOC
item-page links. The import screen fetches the full records through an
administrator-authorized API route, prefills JSON, and resets to dry-run mode.
Importing creates drafts with pending rights records. It does not approve or
publish a title; an administrator must review the evidence and explicitly
publish each title.

## Decision and review boundary

The NASA item records identify NASA as the photographer, and the asset metadata
identifies NASA as creator or credit for the two Apollo 12 files. Those
attributions do not establish the creator and federal employment/official-duty
basis for every part of each complete audiovisual work. The Apollo 11 asset
metadata has no creator value. The available source records do not identify
third-party audio, music, footage, or other incorporated material well enough
to determine whether the rights are cleared.

The complete audio and video of these works has **not** been reviewed. No
third-party-free finding is made. In particular, NASA's `PAO Approved For
Release` metadata is a release note, not a copyright license or a finding that
all incorporated elements are reusable. The Apollo 12 metadata also refers
users to NASA's copyright and media restrictions.

NASA's [Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
say NASA media is generally not subject to U.S. copyright, require source
acknowledgment, and warn that NASA's permission to use third-party material
does not convey rights to others. The guidelines also restrict uses that imply
NASA endorsement and discuss commercial use and identifiable people. Those
limits require review against FamilyFlix's actual use; the NASA catalog record
alone does not decide that question. The proposed U.S. Government-work basis
under [17 U.S.C. §105](https://www.law.cornell.edu/uscode/text/17/105) is not
confirmed for these complete works or every included element. No conclusion is
made for territories outside the United States.

## Candidate findings

| Candidate | What the available NASA records establish | Why it is withheld |
| --- | --- | --- |
| Apollo 11 Moonwalk Montage | NASA's item record describes a two-minute montage and lists NASA as photographer. The asset metadata has no creator value; a NASA caption file exists. | The item record does not establish who created the montage or the federal-work basis for all included footage and audio. The full audiovisual work and any credit notices have not been checked. |
| Apollo 12: Pinpoint for Science | NASA's item record describes HQ-197 as a 28:39 color film and lists NASA as photographer. Asset metadata lists NASA as creator/credit and includes `PAO Approved For Release` plus a reference to NASA media restrictions. | These fields do not establish employment/official-duty authorship for every element or clear third-party material. The available VTT file only labels the first 30 seconds as ambient sounds; it is not a complete transcript or rights review. The full audiovisual work and credit notices have not been checked. |
| Apollo 12 Mission Summary and Highlights | NASA's item record describes a mission summary through splashdown and recovery and lists NASA as photographer. Asset metadata lists NASA as creator/credit, includes `PAO Approved For Release`, and refers to NASA media restrictions. The title record identifies President Nixon in the work. | The metadata does not establish authorship and rights for every element or resolve third-party and identifiable-person issues for FamilyFlix's intended use. The full audiovisual work and credit notices have not been checked. |

The NASA API item records and media collections remain available for reference:

| Candidate | NASA item record | NASA media collection |
| --- | --- | --- |
| Apollo 11 Moonwalk Montage | [NASA API record](https://images-api.nasa.gov/search?nasa_id=Apollo_11_moonwalk_montage_720p&media_type=video) | [Collection](https://images-assets.nasa.gov/video/Apollo_11_moonwalk_montage_720p/collection.json) |
| Apollo 12: Pinpoint for Science | [NASA API record](https://images-api.nasa.gov/search?nasa_id=KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425&media_type=video) | [Collection](https://images-assets.nasa.gov/video/KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425/collection.json) |
| Apollo 12 Mission Summary and Highlights | [NASA API record](https://images-api.nasa.gov/search?nasa_id=KSC-1969-MH-NAS01-0001-Apollo_12_Mission_Summary_Highlights_Splashdown_with_President_Nixon-HM_3599&media_type=video) | [Collection](https://images-assets.nasa.gov/video/KSC-1969-MH-NAS01-0001-Apollo_12_Mission_Summary_Highlights_Splashdown_with_President_Nixon-HM_3599/collection.json) |

## Requirements before reconsideration

- Identify the creator(s) of the complete work and document that any claimed
  U.S. Government authorship was created by a federal employee within official
  duties, or provide another adequate rights basis.
- Inspect the complete audio and video, including opening/closing credits, for
  third-party music, footage, performances, and other protected material.
- Record any separate permissions, attribution, territory, commercial-use,
  endorsement, and identifiable-person limits that apply.
- Have an administrator review the evidence, record a decision, and explicitly
  publish only after approval. Keep each title out of the import pack until
  that review is complete.

The import flow creates drafts with pending rights records; it does not itself
approve or publish titles. This does not replace the separate administrator
evidence review and publication action.
