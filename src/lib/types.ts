export interface Song {
  id: string;
  artist: string;
  title: string;
  year: number | null;
  genre: string | null;
  format: string;
  country: string | null;
  original: string;
  tracklist: string | null;
  description: string | null;
  price_raw: string | null;
  price_eur: number | null;
  top4000: boolean;
  top2023: number | null;
  top2024: number | null;
  top2025: number | null;
  top2026: number | null;
  cover_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Top1000Entry {
  id: string;
  position: number;
  artist: string;
  title: string;
  year: number | null;
  song_id: string | null;
}

export interface Top4000Entry {
  id: string;
  list_year: number;
  position: number;
  artist: string;
  title: string;
  song_year: number | null;
}

export interface CollectionStats {
  total_songs: number;
  total_artists: number;
  total_genres: number;
  total_formats: number;
  total_value: number;
  top4000_count: number;
  with_covers: number;
  earliest_year: number;
  latest_year: number;
}

export interface ArtistSummary {
  artist: string;
  count: number;
}

export type SortField = "title" | "artist" | "year" | "price_eur" | "created_at";
export type SortDir = "asc" | "desc";

export const FORMAT_OPTIONS = [
  "Vinyl 7 Inch 45 RPM",
  "Vinyl 7 Inch 33 RPM",
  "Vinyl Maxi 12 Inch 45 RPM",
  "Vinyl 33 RPM",
  "Vinyl 78 RPM",
  "CD",
  "SACD",
  "Cassette",
  "VHS",
  "DVD",
  "Blu-ray",
  "LaserDisc",
  "Minidisc",
  "4-track",
  "8-track",
  "File",
  "Other",
] as const;
