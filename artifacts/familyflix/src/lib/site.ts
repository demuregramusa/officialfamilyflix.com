export const site = {
  name: "FamilyFlix",
  legalName: "FamilyFlix Media, Inc.",
  tagline: "Free movies and TV for the whole family.",
  description:
    "FamilyFlix streams classic public-domain films, Creative Commons favorites and licensed titles free for the whole family. No subscription, no credit card, no hidden fees — just press play.",
  shortDescription: "Free movies and classic films for the whole family.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.familyflix.com",
  locale: "en-US",
  language: "English (US)",
  category: "Entertainment",
  foundedYear: 2026,
  copyrightYear: 2026,
  supportHours: "24 hours a day, 7 days a week",
  contact: {
    support: "support@familyflix.com",
    press: "press@familyflix.com",
    legal: "legal@familyflix.com",
    privacy: "privacy@familyflix.com",
    advertising: "advertise@familyflix.com",
    developers: "developers@familyflix.com",
    phone: "+1 (800) 555-0142",
    phoneHref: "+18005550142",
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
    line1: "1450 Sunset Plaza Drive",
    line2: "Suite 500",
    city: "Los Angeles",
    region: "CA",
    postalCode: "90069",
    country: "United States",
  },
} as const;

export const companyAddress = `${site.address.line1}, ${site.address.line2}, ${site.address.city}, ${site.address.region} ${site.address.postalCode}, ${site.address.country}`;

export const copyrightLine = `© ${site.copyrightYear} ${site.legalName}. All rights reserved.`;

export const legalLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Ad choices", href: "/privacy#ad-choices" },
] as const;
