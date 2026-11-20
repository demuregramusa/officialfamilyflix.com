import type { MetadataRoute } from "next";

import { titles } from "@/lib/catalog";
import { site } from "@/lib/site";

const STATIC_PAGES = [
  { path: "", priority: 1 },
  { path: "/movies", priority: 0.9 },
  { path: "/tv-shows", priority: 0.9 },
  { path: "/live", priority: 0.8 },
  { path: "/developers", priority: 0.7 },
  { path: "/about", priority: 0.5 },
  { path: "/contact", priority: 0.4 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  const lastModified = new Date();

  return [
    ...STATIC_PAGES.map((page) => ({
      url: `${base}${page.path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: page.priority,
    })),
    ...titles
      .filter((title) => title.type !== "live")
      .map((title) => ({
        url: `${base}/title/${encodeURIComponent(title.slug)}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];
}
