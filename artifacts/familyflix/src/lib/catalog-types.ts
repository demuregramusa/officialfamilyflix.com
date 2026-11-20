export type TitleType = "movie" | "series" | "live";

export interface Episode {
  number: number;
  title: string;
  duration: string;
  synopsis: string;
}

export interface Title {
  slug: string;
  name: string;
  tagline: string;
  year: number;
  type: TitleType;
  rating: string;
  score: number;
  duration?: string;
  seasons?: number;
  genres: string[];
  synopsis: string;
  cast: string[];
  creator: string;
  image: string;
  poster?: string;
  backdrop?: string;
  palette: [string, string];
  badge?: string;
  featured?: boolean;
  episodes?: Episode[];
  live?: { channel: string; onNow: string; next: string; endsIn: number };
}
