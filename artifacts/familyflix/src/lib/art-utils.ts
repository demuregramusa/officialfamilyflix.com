import type { Title } from "@/lib/catalog-types";

const fallbackImage = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&h=600&q=65";
const fallbackBackdrop = "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1440&h=810&q=70";

const unsplash = (image?: string | null, width = 400, height = 600) =>
  image ? `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${width}&h=${height}&q=65` : fallbackImage;

function sanitizeUrl(raw?: string | null, fallback = fallbackImage): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("//") || trimmed.startsWith("/")) {
    return trimmed.replace("https://yts.pw/", "https://img.yts.pw/");
  }
  return unsplash(trimmed);
}

export const posterUrl = (title: Partial<Title> & { posterUrl?: string | null }) => {
  const raw = title.poster || title.posterUrl || title.image;
  return sanitizeUrl(raw, fallbackImage);
};

export const backdropUrl = (title: Partial<Title> & { backdropUrl?: string | null; posterUrl?: string | null }) => {
  const raw = title.backdrop || title.backdropUrl || title.poster || title.posterUrl || title.image;
  return sanitizeUrl(raw, fallbackBackdrop);
};

export const wideUrl = (title: Partial<Title> & { backdropUrl?: string | null; posterUrl?: string | null }) => {
  const raw = title.backdrop || title.backdropUrl || title.poster || title.posterUrl || title.image;
  return sanitizeUrl(raw, fallbackBackdrop);
};
