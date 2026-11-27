import type { MetadataRoute } from "next";

import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — Free Movies & TV Shows`,
    short_name: site.name,
    description: site.shortDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0c1014",
    theme_color: "#0c1014",
    categories: ["entertainment", "video"],
    lang: "en-US",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
