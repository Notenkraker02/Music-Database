import { supabase } from "./supabase";

// A full, self-contained backup of the collection. If the website is ever
// lost, a fresh Supabase project (created from schema.sql in this repo) can be
// repopulated by importing one of these files — no other steps required.

export const BACKUP_VERSION = 2;

// Tables that make up the whole app. `fts` on songs is a generated column and
// must NOT be written back on import.
const TABLES = ["songs", "top1000", "top4000_lists"] as const;
type TableName = (typeof TABLES)[number];

const GENERATED_COLUMNS: Record<string, string[]> = {
  songs: ["fts"],
};

export interface BackupFile {
  version: number;
  exported_at: string;
  tables: Record<TableName, Record<string, unknown>[]>;
  // path -> base64 data URL. Present only if covers were included.
  covers?: Record<string, string>;
}

export interface ProgressFn {
  (message: string): void;
}

// ── Helpers ────────────────────────────────────────────────

/** Fetch every row from a table, paging past Supabase's 1000-row default. */
async function fetchAllRows(table: TableName): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  const batch = 1000;
  let start = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(start, start + batch - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...(rows as Record<string, unknown>[]));
    if (rows.length < batch) break;
    start += batch;
  }
  return all;
}

function stripGenerated(table: TableName, rows: Record<string, unknown>[]) {
  const drop = GENERATED_COLUMNS[table];
  if (!drop || drop.length === 0) return rows;
  return rows.map((row) => {
    const copy = { ...row };
    for (const col of drop) delete copy[col];
    return copy;
  });
}

/** Storage path as used by the covers bucket (no leading "covers/"). */
function coverStoragePath(coverPath: string): string {
  return coverPath.startsWith("covers/") ? coverPath.replace("covers/", "") : coverPath;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

// ── Export ─────────────────────────────────────────────────

export async function createBackup(
  includeCovers: boolean,
  onProgress: ProgressFn = () => {}
): Promise<BackupFile> {
  const tables = {} as Record<TableName, Record<string, unknown>[]>;

  for (const table of TABLES) {
    onProgress(`Reading ${table}…`);
    tables[table] = await fetchAllRows(table);
  }

  const backup: BackupFile = {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    tables,
  };

  if (includeCovers) {
    const covers: Record<string, string> = {};
    const paths = Array.from(
      new Set(
        (tables.songs as { cover_path?: string | null }[])
          .map((s) => s.cover_path)
          .filter((p): p is string => !!p)
      )
    );

    let done = 0;
    for (const path of paths) {
      done++;
      onProgress(`Downloading cover ${done}/${paths.length}…`);
      try {
        const storagePath = coverStoragePath(path);
        const { data } = supabase.storage.from("covers").getPublicUrl(storagePath);
        const url = data.publicUrl;
        if (!url) continue;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        covers[path] = await blobToDataUrl(await resp.blob());
      } catch {
        // Skip a cover that fails to download rather than aborting the backup.
      }
    }
    backup.covers = covers;
  }

  return backup;
}

export function downloadBackup(backup: BackupFile) {
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `music-collection-backup-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import / restore ───────────────────────────────────────

export interface RestoreResult {
  inserted: Record<string, number>;
  coversUploaded: number;
  warnings: string[];
}

function isBackupFile(obj: unknown): obj is BackupFile {
  if (!obj || typeof obj !== "object") return false;
  const b = obj as Record<string, unknown>;
  return typeof b.version === "number" && typeof b.tables === "object" && b.tables !== null;
}

export async function restoreBackup(
  raw: string,
  restoreCovers: boolean,
  onProgress: ProgressFn = () => {}
): Promise<RestoreResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  if (!isBackupFile(parsed)) {
    throw new Error("That file does not look like a collection backup.");
  }

  const backup = parsed;
  const result: RestoreResult = { inserted: {}, coversUploaded: 0, warnings: [] };

  // Upsert on primary key so a restore is safe to run more than once and does
  // not require wiping the database first.
  for (const table of TABLES) {
    const rows = stripGenerated(table, backup.tables[table] || []);
    result.inserted[table] = 0;
    if (rows.length === 0) continue;

    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      onProgress(`Restoring ${table} ${i + 1}–${i + chunk.length}…`);
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: "id" });
      if (error) {
        result.warnings.push(`${table}: ${error.message}`);
      } else {
        result.inserted[table] += chunk.length;
      }
    }
  }

  if (restoreCovers && backup.covers) {
    const entries = Object.entries(backup.covers);
    let done = 0;
    for (const [path, dataUrl] of entries) {
      done++;
      onProgress(`Uploading cover ${done}/${entries.length}…`);
      try {
        const blob = await dataUrlToBlob(dataUrl);
        const storagePath = coverStoragePath(path);
        const { error } = await supabase.storage
          .from("covers")
          .upload(storagePath, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
        if (error) {
          result.warnings.push(`cover ${path}: ${error.message}`);
        } else {
          result.coversUploaded++;
        }
      } catch (e) {
        result.warnings.push(`cover ${path}: ${(e as Error).message}`);
      }
    }
  } else if (restoreCovers && !backup.covers) {
    result.warnings.push("This backup did not include cover images, so none were restored.");
  }

  return result;
}
