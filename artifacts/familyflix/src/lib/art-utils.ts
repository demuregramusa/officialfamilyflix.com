import type { Title } from "@/lib/catalog-types";

const unsplash = (image: string, width: number, height: number) =>
  `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&h=${height}&q=65`;

export const posterUrl = (title: Title) =>
  title.poster ?? unsplash(title.image, 400, 600);

export const backdropUrl = (title: Title) =>
  title.backdrop ?? title.poster ?? unsplash(title.image, 1440, 810);

export const wideUrl = (title: Title) =>
  title.backdrop ?? title.poster ?? unsplash(title.image, 640, 360);
