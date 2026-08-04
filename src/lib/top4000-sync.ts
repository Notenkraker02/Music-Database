import { supabase } from "@/lib/supabase";

type RankingFields = {
  top2023: number | null;
  top2024: number | null;
  top2025: number | null;
  top2026: number | null;
};

type Top4000Row = {
  list_year: number;
  position: number;
  artist: string;
  title: string;
};

const TOP4000_YEARS = [2023, 2024, 2025, 2026] as const;

function normalizeText(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalKey(row: Top4000Row): string {
  return `${normalizeText(row.artist)}|||${normalizeText(row.title)}`;
}

async function fetchAllTop4000Rows(): Promise<Top4000Row[]> {
  const allRows: Top4000Row[] = [];
  const batchSize = 1000;
  let start = 0;

  while (true) {
    const end = start + batchSize - 1;

    const { data, error } = await supabase
      .from("top4000_lists")
      .select("list_year, position, artist, title")
      .range(start, end);

    if (error) {
      console.error("Could not fetch Top 4000 rows:", error);
      return allRows;
    }

    const rows = (data || []) as Top4000Row[];
    allRows.push(...rows);

    if (rows.length < batchSize) break;

    start += batchSize;
  }

  return allRows;
}

export async function autofillRankingsFromAnchors(
  currentRankings: RankingFields
): Promise<RankingFields> {
  const allTop4000Rows = await fetchAllTop4000Rows();

  if (allTop4000Rows.length === 0) {
    return currentRankings;
  }

  const byYearAndPosition = new Map<string, Top4000Row>();
  const byCanonicalSong = new Map<string, Record<number, number>>();

  for (const row of allTop4000Rows) {
    if (!row.list_year || !row.position || !row.artist || !row.title) {
      continue;
    }

    const yearPositionKey = `${row.list_year}|||${row.position}`;
    byYearAndPosition.set(yearPositionKey, row);

    const key = canonicalKey(row);

    if (!byCanonicalSong.has(key)) {
      byCanonicalSong.set(key, {});
    }

    byCanonicalSong.get(key)![row.list_year] = row.position;
  }

  const anchors: Top4000Row[] = [];

  for (const year of TOP4000_YEARS) {
    const column = `top${year}` as keyof RankingFields;
    const position = currentRankings[column];

    if (position === null) continue;

    const anchor = byYearAndPosition.get(`${year}|||${position}`);

    if (anchor) {
      anchors.push(anchor);
    } else {
      console.warn(
        `Ranking anchor not found in Top 4000 list: ${year} #${position}`
      );
    }
  }

  // No existing ranking means we cannot safely infer the canonical Top 4000 song.
  // This is intentional, because the record title may differ from the Top 4000 song title.
  if (anchors.length === 0) {
    return currentRankings;
  }

  const anchorKeys = Array.from(new Set(anchors.map(canonicalKey)));

  // If the entered rankings point to different Top 4000 songs, do not guess.
  if (anchorKeys.length > 1) {
    console.warn(
      "Conflicting Top 4000 anchors found. No automatic autofill applied.",
      anchors
    );
    return currentRankings;
  }

  const key = anchorKeys[0];
  const knownYears = byCanonicalSong.get(key);

  if (!knownYears) {
    return currentRankings;
  }

  return {
    top2023:
      currentRankings.top2023 === null && knownYears[2023]
        ? knownYears[2023]
        : currentRankings.top2023,

    top2024:
      currentRankings.top2024 === null && knownYears[2024]
        ? knownYears[2024]
        : currentRankings.top2024,

    top2025:
      currentRankings.top2025 === null && knownYears[2025]
        ? knownYears[2025]
        : currentRankings.top2025,

    top2026:
      currentRankings.top2026 === null && knownYears[2026]
        ? knownYears[2026]
        : currentRankings.top2026,
  };
}


