"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronDown, ChevronUp, CornerDownLeft } from "lucide-react";
import { fetchTop4000List, fetchAvailableTop4000Years } from "@/lib/queries";
import type { Top4000Entry } from "@/lib/types";

interface Top4000LookupProps {
  /** Pre-fill the search box (e.g. the record's artist). */
  defaultQuery?: string;
  /** Called when a result's "Use" button is clicked, so the parent form can
   *  drop the position into the matching year field. */
  onPick?: (year: number, position: number) => void;
}

export function Top4000Lookup({ defaultQuery = "", onPick }: Top4000LookupProps) {
  const [open, setOpen] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Top4000Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Load the available years once, defaulting to the most recent.
  useEffect(() => {
    fetchAvailableTop4000Years().then((ys) => {
      setYears(ys);
      if (ys.length) setYear(ys[ys.length - 1]);
    });
  }, []);

  // Seed the search box with the artist the first time the panel is opened.
  useEffect(() => {
    if (open && !query && defaultQuery) setQuery(defaultQuery);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback(async () => {
    if (!year || query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const { entries } = await fetchTop4000List(year, query.trim(), 1, 25);
    setResults(entries);
    setSearched(true);
    setLoading(false);
  }, [year, query]);

  // Debounced search as the user types / switches year.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(runSearch, 300);
    return () => clearTimeout(t);
  }, [runSearch, open]);

  return (
    <div className="mt-4 border-t border-ink-800 pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-groove transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        Look up a song&apos;s position in a yearly list
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <select
              value={year ?? ""}
              onChange={(e) => setYear(Number(e.target.value))}
              className="input-field w-28 shrink-0"
              aria-label="List year"
            >
              {years.length === 0 && <option value="">—</option>}
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search artist or title…"
              className="input-field flex-1"
              aria-label="Search the yearly list"
            />
          </div>

          <div className="max-h-56 overflow-y-auto pr-1 space-y-1">
            {loading && <p className="text-xs text-ink-500 px-1">Searching…</p>}

            {!loading && searched && results.length === 0 && (
              <p className="text-xs text-ink-500 px-1">
                Not found in the {year} list.
              </p>
            )}

            {!loading &&
              results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded bg-ink-800/40 hover:bg-ink-800/70 transition-colors"
                >
                  <span className="text-xs font-mono text-groove w-12 shrink-0">
                    #{r.position}
                  </span>
                  <span className="text-sm text-ink-200 flex-1 truncate">
                    {r.title} <span className="text-ink-500">— {r.artist}</span>
                  </span>
                  {onPick && year && (
                    <button
                      type="button"
                      onClick={() => onPick(year, r.position)}
                      title={`Fill the ${year} field with #${r.position}`}
                      className="flex items-center gap-1 text-xs text-groove hover:text-groove-light shrink-0"
                    >
                      <CornerDownLeft className="w-3 h-3" /> Use
                    </button>
                  )}
                </div>
              ))}
          </div>

          {query.trim().length > 0 && query.trim().length < 2 && (
            <p className="text-xs text-ink-500">Type at least 2 characters.</p>
          )}
        </div>
      )}
    </div>
  );
}
