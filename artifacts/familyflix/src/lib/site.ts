export const site = {
  name: "FamilyFlix",
  legalName: "FamilyFlix By DemureGram Foundation",
  tagline: "Free movies and TV for the whole family.",
  description:
    "FamilyFlix By DemureGram streams classic public-domain films, Creative Commons favorites, and verified licensed titles 100% free for the whole family. Originally founded in 2023 as Movie Source and rebranded in 2026 to FamilyFlix under DemureGram, led by Founder & CEO Prisandra T. Taylor.",
  shortDescription: "Free movies and classic films for the whole family.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://familyflix.demuregram.com",
  locale: "en-US",
  language: "English (US)",
  category: "Entertainment",
  foundedYear: 2023,
  rebrandYear: 2026,
  copyrightYear: 2026,
  leadership: {
    founderAndCeo: "Prisandra T. Taylor",
    originalFounder: "Princeton T. Taylor",
    parentCompany: "DemureGram",
  },
  supportHours: "24 hours a day, 7 days a week",
  contact: {
    support: "support@familyflix.demuregram.com",
    press: "press@familyflix.demuregram.com",
    legal: "legal@familyflix.demuregram.com",
    privacy: "privacy@familyflix.demuregram.com",
    advertising: "advertise@familyflix.demuregram.com",
    developers: "developers@familyflix.demuregram.com",
  },
  developer: {
    licenseFee: 3786.09,
    currency: "USD",
    licenseName: "FamilyFlix Developer License",
    requestSubject: "FamilyFlix Developer API access",
    publicRateLimit: 30,
    licensedRateLimit: 120,
    rateWindowMinutes: 1,
  },
  address: {
    city: "Los Angeles",
    region: "CA",
    country: "United States",
  },
} as const;

export const companyAddress = `${site.address.city}, ${site.address.region}, ${site.address.country}`;

export const copyrightLine = `© ${site.copyrightYear} ${site.legalName}. All rights reserved.`;

export const legalLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Ad choices", href: "/privacy#ad-choices" },
] as const;
