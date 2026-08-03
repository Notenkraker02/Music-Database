/** Format EUR value for display */
export function formatPrice(val: number | null | undefined): string {
  if (val == null || val === 0) return "—";
  return `€${val.toFixed(2).replace(".", ",")}`;
}

/** Parse tracklist durations like "(3:46)" and return total seconds */
export function parseTracklistDuration(tracklist: string | null): number {
  if (!tracklist) return 0;
  const matches = tracklist.matchAll(/\((\d+):(\d{2})\)/g);
  let total = 0;
  for (const m of matches) {
    total += parseInt(m[1]) * 60 + parseInt(m[2]);
  }
  return total;
}

/** Format seconds to "Xh YYm ZZs" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

/** Get first letter for alphabet grouping */
export function getFirstLetter(str: string): string {
  if (!str || !str.trim()) return "?";
  let s = str.trim();
  if (s[0] >= "0" && s[0] <= "9") return "#";
  if (s[0] === "'") s = s.slice(1).trim();
  if (s[0] === "(") {
    const close = s.indexOf(")");
    if (close !== -1 && close + 1 < s.length) {
      s = s.slice(close + 1).trim();
    }
  }
  return s[0]?.toUpperCase() || "?";
}

/** Debounce helper */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Pluralize */
export function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

/** Clamp */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Get decade string from year */
export function getDecade(year: number | null): string {
  if (!year) return "Unknown";
  return `${Math.floor(year / 10) * 10}s`;
}
