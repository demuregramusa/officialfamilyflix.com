import type { TitleInput } from "@workspace/api-zod";

const locCredit =
  "Library of Congress, Motion Picture, Broadcasting, and Recorded Sound Division, Before and After the Great Earthquake and Fire: Early Films of San Francisco, 1897 to 1916 Collection";
const licenseVersion = "LOC collection public-domain notice";

/**
 * Direct HLS URLs are intentionally server-only. The administrator-only route
 * returns these records when an administrator explicitly loads the import pack.
 */
export const curatedPublicDomainTitles: TitleInput[] = [
  {
    name: "A trip down Market Street before the fire",
    kind: "movie",
    synopsis:
      "A silent camera ride through Market Street, filmed on April 14, 1906, four days before the earthquake and fire. The Library of Congress describes it as a rare record of the downtown area before its destruction.",
    year: 1906,
    creatorAttribution: "Miles Brothers (Library of Congress contributor attribution)",
    durationMinutes: 10,
    genres: ["Documentary", "History"],
    cast: [],
    featured: false,
    stream: {
      provider: "manual",
      hlsUrl:
        "https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:00015143:00015143/full/full/0/full/default.m3u8",
      signedPlayback: false,
    },
    rights: [
      {
        assetKind: "main-video",
        assetLabel: "Library of Congress digital viewing copy",
        assetUrl:
          "https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:00015143:00015143/full/full/0/full/default.m3u8",
        rightsHolder: "Public domain in the United States (Library of Congress item record)",
        creatorAttribution: `Miles Brothers (catalog attribution); source credit: ${locCredit}`,
        licenseType: "public-domain",
        licenseVersion,
        licenseUrl: "https://www.loc.gov/item/00694408/",
        usageRestrictions: [
          "U.S. public-domain status only; no foreign-territory conclusion is made.",
          `Use the Library of Congress source credit: ${locCredit}.`,
          "The Library of Congress advises users to assess any separate privacy, publicity, trademark, or other rights that may apply.",
        ],
        sourceUrl: "https://www.loc.gov/item/00694408/",
        evidenceUrl: "https://www.loc.gov/item/00694408/",
        evidenceNotes:
          "The item-level Library of Congress record dates the film to 1906, identifies Miles Brothers as a contributor, classifies it as a silent film, and states that the contents of its Before and After the Great Earthquake and Fire: Early Films of San Francisco, 1897 to 1916 Collection are in the public domain and free to use and reuse. The record's credit line is included above. The direct HLS master playlist is the LOC digital viewing copy listed by the item record. FamilyFlix has not made a legal determination outside the United States or independently audited the source file for added material; administrator rights review remains required.",
        territory: "United States only; other territories not assessed",
        expiresAt: null,
        uploaderAttested: true,
      },
    ],
    uploaderAttested: true,
  },
  {
    name: "San Francisco earthquake and fire, April 18, 1906",
    kind: "movie",
    synopsis:
      "Silent actuality footage documenting the aftermath of the 1906 earthquake and fire in San Francisco and Oakland. The Library of Congress notes that some title cards are sensationalized and one family scene may have been staged.",
    year: 1906,
    creatorAttribution: "Filmmaker unidentified in the Library of Congress item record",
    durationMinutes: 13,
    genres: ["Documentary", "History"],
    cast: [],
    featured: false,
    stream: {
      provider: "manual",
      hlsUrl:
        "https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:00007947:00007947/full/full/0/full/default.m3u8",
      signedPlayback: false,
    },
    rights: [
      {
        assetKind: "main-video",
        assetLabel: "Library of Congress digital viewing copy",
        assetUrl:
          "https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:00007947:00007947/full/full/0/full/default.m3u8",
        rightsHolder: "Public domain in the United States (Library of Congress item record)",
        creatorAttribution: `Filmmaker unidentified in the item record; source credit: ${locCredit}`,
        licenseType: "public-domain",
        licenseVersion,
        licenseUrl: "https://www.loc.gov/item/00694425/",
        usageRestrictions: [
          "U.S. public-domain status only; no foreign-territory conclusion is made.",
          `Use the Library of Congress source credit: ${locCredit}.`,
          "The Library of Congress item record says some title cards are sensationalized and one scene may have been staged.",
          "The Library of Congress advises users to assess any separate privacy, publicity, trademark, or other rights that may apply.",
        ],
        sourceUrl: "https://www.loc.gov/item/00694425/",
        evidenceUrl: "https://www.loc.gov/item/00694425/",
        evidenceNotes:
          "The item-level Library of Congress record dates this silent actuality film to 1906, says it was photographed in San Francisco and Oakland in early May, and states that the contents of its Before and After the Great Earthquake and Fire: Early Films of San Francisco, 1897 to 1916 Collection are in the public domain and free to use and reuse. The record does not identify the filmmaker. It warns that some title cards are sensationalized and a family scene may have been staged. The direct HLS master playlist is the LOC digital viewing copy listed by the item record. FamilyFlix has not made a legal determination outside the United States or independently audited the source file for added material; administrator rights review remains required.",
        territory: "United States only; other territories not assessed",
        expiresAt: null,
        uploaderAttested: true,
      },
    ],
    uploaderAttested: true,
  },
  {
    name: "TR in San Francisco, 1903",
    kind: "movie",
    synopsis:
      "Silent actuality footage of President Theodore Roosevelt's visit to San Francisco. The Library of Congress record notes that the film may combine footage made on May 12 and May 13, 1903.",
    year: 1903,
    creatorAttribution: "Filmmaker unidentified in the Library of Congress item record",
    durationMinutes: 3,
    genres: ["Documentary", "History"],
    cast: ["Theodore Roosevelt"],
    featured: false,
    stream: {
      provider: "manual",
      hlsUrl:
        "https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:01877808:01877808/full/full/0/full/default.m3u8",
      signedPlayback: false,
    },
    rights: [
      {
        assetKind: "main-video",
        assetLabel: "Library of Congress digital viewing copy",
        assetUrl:
          "https://tile.loc.gov/streaming-services/iiif/service:mbrs:ntscrm:01877808:01877808/full/full/0/full/default.m3u8",
        rightsHolder: "Public domain in the United States (Library of Congress item record)",
        creatorAttribution: `Filmmaker unidentified in the item record; source credit: ${locCredit}`,
        licenseType: "public-domain",
        licenseVersion,
        licenseUrl: "https://www.loc.gov/item/00694419/",
        usageRestrictions: [
          "U.S. public-domain status only; no foreign-territory conclusion is made.",
          `Use the Library of Congress source credit: ${locCredit}.`,
          "The Library of Congress item record says the footage may combine two filming dates.",
          "The Library of Congress advises users to assess any separate privacy, publicity, trademark, or other rights that may apply.",
        ],
        sourceUrl: "https://www.loc.gov/item/00694419/",
        evidenceUrl: "https://www.loc.gov/item/00694419/",
        evidenceNotes:
          "The item-level Library of Congress record dates this silent actuality film to 1903, describes Theodore Roosevelt's visit to San Francisco, and states that the contents of its Before and After the Great Earthquake and Fire: Early Films of San Francisco, 1897 to 1916 Collection are in the public domain and free to use and reuse. The record does not identify the filmmaker and notes that the footage may combine May 12 and May 13. The direct HLS master playlist is the LOC digital viewing copy listed by the item record. FamilyFlix has not made a legal determination outside the United States or independently audited the source file for added material; administrator rights review remains required.",
        territory: "United States only; other territories not assessed",
        expiresAt: null,
        uploaderAttested: true,
      },
    ],
    uploaderAttested: true,
  },
];
