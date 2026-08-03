import { supabase } from "./supabase";
import type { Song, Top1000Entry, Top4000Entry, CollectionStats, SortField, SortDir } from "./types";

// ── Songs ──────────────────────────────────────────────────

interface FetchSongsOpts {
  search?: string;
  genre?: string;
  format?: string;
  decade?: string;
  top4000?: boolean;
  sortField?: SortField;
  sortDir?: SortDir;
  page?: number;
  pageSize?: number;
} 

export async function fetchSongs(opts: FetchSongsOpts = {}) {
  const {
    search,
    genre,
    format,
    decade,
    top4000,
    sortField = "artist",
    sortDir = "asc",
    page = 1,
    pageSize = 48,
  } = opts;

  let query = supabase
    .from("songs")
    .select("*", { count: "exact" });

  if (search) {
    query = query.or(
      `artist.ilike.%${search}%,title.ilike.%${search}%`
    );
  }
  if (genre) query = query.eq("genre", genre);
  if (format) query = query.eq("format", format);
  if (top4000 !== undefined) query = query.eq("top4000", top4000);
  if (decade) {
    const start = parseInt(decade);
    if (!isNaN(start)) {
      query = query.gte("year", start).lt("year", start + 10);
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order(sortField, { ascending: sortDir === "asc" });
  // Secondary sort for stability
  if (sortField !== "title") {
    query = query.order("title", { ascending: true });
  }
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { songs: (data || []) as Song[], total: count || 0 };
}

export async function fetchSongById(id: string): Promise<Song | null> {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Song;
}

export async function fetchSongsByArtist(artist: string): Promise<Song[]> {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .eq("artist", artist)
    .order("year", { ascending: true });
  if (error) throw error;
  return (data || []) as Song[];
}

// ── Artists ────────────────────────────────────────────────

export async function fetchArtists(search?: string) {
  // Use RPC or a raw query approach — group by artist
  let query = supabase
    .from("songs")
    .select("artist");

  if (search) {
    query = query.ilike("artist", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Group and count client-side (Supabase JS doesn't do GROUP BY natively)
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    const a = row.artist || "Unknown";
    counts[a] = (counts[a] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => a.artist.localeCompare(b.artist));
}

// ── Stats ──────────────────────────────────────────────────

export async function fetchStats(): Promise<CollectionStats> {
  const { data, error } = await supabase
    .from("collection_stats")
    .select("*")
    .single();
  if (error) {
    // Fallback if view doesn't exist
    return {
      total_songs: 0, total_artists: 0, total_genres: 0,
      total_formats: 0, total_value: 0, top4000_count: 0,
      with_covers: 0, earliest_year: 0, latest_year: 0,
    };
  }
  return data as CollectionStats;
}

export async function fetchTotalPlaytime(): Promise<number> {
  const { data } = await supabase
    .from("songs")
    .select("tracklist")
    .not("tracklist", "is", null);

  if (!data) return 0;
  let total = 0;
  for (const row of data) {
    const regex = /\((\d+):(\d{2})\)/g;
    const tracklist = (row.tracklist as string) || "";

    let match: RegExpExecArray | null;
    while ((match = regex.exec(tracklist)) !== null) {
      total += Number(match[1]) * 60 + Number(match[2]);
    }
  }
  return total;
}
 
// ── Genres / Formats / Decades ─────────────────────────────

export async function fetchDistinctValues(column: "genre" | "format" | "country"): Promise<string[]> {
  const { data } = await supabase
    .from("songs")
    .select(column)
    .not(column, "is", null)
    .not(column, "eq", "");

  if (!data) return [];
  const unique = [...new Set(data.map((r) => r[column] as string))].filter(Boolean).sort();
  return unique;
}

// ── Top 1000 ───────────────────────────────────────────────

export async function fetchTop1000(search?: string): Promise<Top1000Entry[]> {
  let query = supabase
    .from("top1000")
    .select("*")
    .order("position", { ascending: true });

  if (search) {
    query = query.or(
      `artist.ilike.%${search}%,title.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Top1000Entry[];
}

// ── Top 4000 Lists ─────────────────────────────────────────

export async function fetchTop4000List(
  year: number,
  search?: string,
  page = 1,
  pageSize = 100
): Promise<{ entries: Top4000Entry[]; total: number }> {
  let query = supabase
    .from("top4000_lists")
    .select("*", { count: "exact" })
    .eq("list_year", year)
    .order("position", { ascending: true });

  if (search) {
    query = query.or(
      `artist.ilike.%${search}%,title.ilike.%${search}%`
    );
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { entries: (data || []) as Top4000Entry[], total: count || 0 };
}

export async function fetchAvailableTop4000Years(): Promise<number[]> {
  const { data } = await supabase
    .from("top4000_lists")
    .select("list_year")
    .limit(1000);

  if (!data) return [];
  return [...new Set(data.map((r) => r.list_year))].sort();
}

// ── My Top 4000 (cross-reference) ──────────────────────────

export async function fetchMyTop4000Positions(year: number): Promise<number[]> {
  const col = `top${year}` as keyof Song;
  const { data } = await supabase
    .from("songs")
    .select(col as string)
    .not(col as string, "is", null);

  if (!data) return [];
  return data.map((r) => r[col as string] as number).filter((n) => n > 0);
}

// ── CRUD ───────────────────────────────────────────────────

export async function createSong(song: Partial<Song>): Promise<Song> {
  const { data, error } = await supabase
    .from("songs")
    .insert(song)
    .select()
    .single();
  if (error) throw error;
  return data as Song;
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<Song> {
  const { data, error } = await supabase
    .from("songs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Song;
}

export async function deleteSong(id: string): Promise<void> {
  const { error } = await supabase
    .from("songs")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ── Recently added ─────────────────────────────────────────

export async function fetchRecentSongs(limit = 10): Promise<Song[]> {
  const { data, error } = await supabase
    .from("songs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as Song[];
}

// ── Random song ────────────────────────────────────────────

export async function fetchRandomSong(): Promise<Song | null> {
  // Get count then pick random offset
  const { count } = await supabase
    .from("songs")
    .select("id", { count: "exact", head: true });

  if (!count || count === 0) return null;

  const offset = Math.floor(Math.random() * count);
  const { data } = await supabase
    .from("songs")
    .select("*")
    .range(offset, offset)
    .single();

  return data as Song | null;
}

// ── Decade distribution ────────────────────────────────────

export async function fetchDecadeDistribution(): Promise<{ decade: string; count: number }[]> {
  const { data } = await supabase
    .from("songs")
    .select("year")
    .not("year", "is", null);

  if (!data) return [];
  const decades: Record<string, number> = {};
  for (const row of data) {
    const d = Math.floor((row.year as number) / 10) * 10;
    const label = `${d}s`;
    decades[label] = (decades[label] || 0) + 1;
  }
  return Object.entries(decades)
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade.localeCompare(b.decade));
}
