const NASA_MEDIA_GUIDELINES =
  "https://www.nasa.gov/nasa-brand-center/images-and-media/";
const US_GOVERNMENT_WORKS_STATUTE =
  "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title17-section105&num=0&edition=prelim";

const NASA_MEDIA = {
  apollo11: {
    catalog:
      "https://images-api.nasa.gov/search?nasa_id=Apollo_11_moonwalk_montage_720p&media_type=video",
    collection:
      "https://images-assets.nasa.gov/video/Apollo_11_moonwalk_montage_720p/collection.json",
    mp4: "https://images-assets.nasa.gov/video/Apollo_11_moonwalk_montage_720p/Apollo_11_moonwalk_montage_720p~small.mp4",
  },
  apollo12Science: {
    catalog:
      "https://images-api.nasa.gov/search?nasa_id=KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425&media_type=video",
    collection:
      "https://images-assets.nasa.gov/video/KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425/collection.json",
    mp4: "https://images-assets.nasa.gov/video/KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425/KSC-1969-MH-NAS01-0001-Apollo_12_Pinpoint_for_Science-B_425~small.mp4",
  },
  apollo12Mission: {
    catalog:
      "https://images-api.nasa.gov/search?nasa_id=KSC-1969-MH-NAS01-0001-Apollo_12_Mission_Summary_Highlights_Splashdown_with_President_Nixon-HM_3599&media_type=video",
    collection:
      "https://images-assets.nasa.gov/video/KSC-1969-MH-NAS01-0001-Apollo_12_Mission_Summary_Highlights_Splashdown_with_President_Nixon-HM_3599/collection.json",
    mp4: "https://images-assets.nasa.gov/video/KSC-1969-MH-NAS01-0001-Apollo_12_Mission_Summary_Highlights_Splashdown_with_President_Nixon-HM_3599/KSC-1969-MH-NAS01-0001-Apollo_12_Mission_Summary_Highlights_Splashdown_with_President_Nixon-HM_3599~small.mp4",
  },
} as const;

const NASA_REVIEW_RESTRICTIONS = [
  "Public-domain basis is limited to the United States; confirm other territories separately.",
  "Review NASA media and brand guidance; do not imply NASA endorsement.",
  "Check the full video for third-party music, footage, or other protected material before approval.",
  "Confirm the U.S. Government authorship basis and suitability for the service before approval.",
];

function mainVideoRights(input: {
  assetUrl: string;
  catalogUrl: string;
  collectionUrl: string;
  creator: string;
  evidence: string;
}) {
  return {
    assetKind: "main-video",
    assetLabel: "Main video",
    assetUrl: input.assetUrl,
    rightsHolder: "United States Government — NASA, as identified in the NASA catalog",
    creatorAttribution: input.creator,
    licenseType: "public-domain",
    licenseVersion: "17 U.S.C. §105 (U.S. Government work)",
    licenseUrl: NASA_MEDIA_GUIDELINES,
    usageRestrictions: NASA_REVIEW_RESTRICTIONS,
    sourceUrl: input.collectionUrl,
    evidenceUrl: input.catalogUrl,
    evidenceNotes:
      `${input.evidence} NASA's media guidance says NASA content is generally not subject to U.S. copyright and requires NASA attribution, while warning that some NASA pages contain separately copyrighted third-party material. The proposed basis is 17 U.S.C. §105 for a U.S. Government work (${US_GOVERNMENT_WORKS_STATUTE}). This is a U.S.-only preliminary basis. An administrator must confirm authorship, inspect the complete audiovisual work for third-party elements, and assess the service's use before approval. Do not publish automatically.`,
    territory: "United States",
    expiresAt: null,
    uploaderAttested: true,
  };
}

function nasaStream(mp4Url: string) {
  return { provider: "manual", mp4Url, signedPlayback: false };
}

/**
 * Review-ready import candidates backed by NASA's own item records and media.
 * They remain drafts and require an administrator's separate rights approval
 * and publication action. No production catalog is changed by loading this data.
 */
export const curatedPublicDomainTitles = [
  {
    name: "Apollo 11 Moonwalk Montage",
    kind: "movie",
    synopsis:
      "A two-minute NASA montage of highlights from the Apollo 11 moonwalk, featuring Neil Armstrong and Buzz Aldrin.",
    year: 2017,
    creatorAttribution: "NASA",
    genres: ["Documentary", "History", "Science"],
    cast: ["Neil Armstrong", "Buzz Aldrin"],
    durationMinutes: 2,
    featured: false,
    rights: [
      mainVideoRights({
        assetUrl: NASA_MEDIA.apollo11.mp4,
        catalogUrl: NASA_MEDIA.apollo11.catalog,
        collectionUrl: NASA_MEDIA.apollo11.collection,
        creator: "NASA (NASA catalog photographer credit)",
        evidence:
          "NASA's item record identifies this as a two-minute Apollo 11 moonwalk montage and credits NASA as photographer.",
      }),
    ],
    stream: nasaStream(NASA_MEDIA.apollo11.mp4),
    uploaderAttested: true,
  },
  {
    name: "Apollo 12: Pinpoint for Science",
    kind: "movie",
    synopsis:
      "NASA's 1969 film documents the Apollo 12 lunar landing, including scientific equipment deployment, Surveyor inspection, sample collection, and photography.",
    year: 1969,
    creatorAttribution: "NASA",
    genres: ["Documentary", "History", "Science"],
    cast: ["Charles Conrad", "Richard F. Gordon", "Alan L. Bean"],
    durationMinutes: 29,
    featured: false,
    rights: [
      mainVideoRights({
        assetUrl: NASA_MEDIA.apollo12Science.mp4,
        catalogUrl: NASA_MEDIA.apollo12Science.catalog,
        collectionUrl: NASA_MEDIA.apollo12Science.collection,
        creator: "NASA (NASA catalog photographer credit)",
        evidence:
          "NASA's item record identifies HQ-197 as a 1969, 28-minute color film and credits NASA as photographer.",
      }),
    ],
    stream: nasaStream(NASA_MEDIA.apollo12Science.mp4),
    uploaderAttested: true,
  },
  {
    name: "Apollo 12 Mission Summary and Highlights",
    kind: "movie",
    synopsis:
      "NASA's Apollo 12 mission film follows the flight from prelaunch and liftoff through splashdown and recovery, including President Nixon's visit.",
    year: 1969,
    creatorAttribution: "NASA",
    genres: ["Documentary", "History", "Science"],
    cast: ["Charles Conrad", "Richard F. Gordon", "Alan L. Bean"],
    durationMinutes: 66,
    featured: false,
    rights: [
      mainVideoRights({
        assetUrl: NASA_MEDIA.apollo12Mission.mp4,
        catalogUrl: NASA_MEDIA.apollo12Mission.catalog,
        collectionUrl: NASA_MEDIA.apollo12Mission.collection,
        creator: "NASA (NASA catalog photographer credit)",
        evidence:
          "NASA's item record describes this as the Apollo 12 mission summary, covering pre-launch through splashdown and recovery, and credits NASA as photographer.",
      }),
    ],
    stream: nasaStream(NASA_MEDIA.apollo12Mission.mp4),
    uploaderAttested: true,
  },
] as const;
