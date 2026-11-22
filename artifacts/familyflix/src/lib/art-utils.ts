import type { Title } from "@/lib/catalog-types";

const fallbackImage = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&h=600&q=65";
const fallbackBackdrop = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1440&h=810&q=70";

const unsplash = (image?: string | null, width = 400, height = 600) =>
  image ? `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&h=${height}&q=65` : fallbackImage;

export const posterUrl = (title: Partial<Title> & { posterUrl?: string | null }) =>
  title.poster || title.posterUrl || (title.image ? unsplash(title.image, 400, 600) : fallbackImage);

export const backdropUrl = (title: Partial<Title> & { backdropUrl?: string | null; posterUrl?: string | null }) =>
  title.backdrop || title.backdropUrl || title.poster || title.posterUrl || (title.image ? unsplash(title.image, 1440, 810) : fallbackBackdrop);

export const wideUrl = (title: Partial<Title> & { backdropUrl?: string | null; posterUrl?: string | null }) =>
  title.backdrop || title.backdropUrl || title.poster || title.posterUrl || (title.image ? unsplash(title.image, 640, 360) : fallbackBackdrop);
