/**
 * Safe client-side index only. Direct media URLs and import payloads are kept
 * server-side and fetched only through the administrator-authorized API.
 */
export const curatedPublicDomainTitles = [
  {
    name: "A trip down Market Street before the fire",
    year: 1906,
    sourceUrl: "https://www.loc.gov/item/00694408/",
  },
  {
    name: "San Francisco earthquake and fire, April 18, 1906",
    year: 1906,
    sourceUrl: "https://www.loc.gov/item/00694425/",
  },
  {
    name: "TR in San Francisco, 1903",
    year: 1903,
    sourceUrl: "https://www.loc.gov/item/00694419/",
  },
] as const;
