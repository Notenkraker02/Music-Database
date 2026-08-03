"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

interface FilterPanelProps {
  genres: string[];
  formats: string[];
  selectedGenre: string;
  selectedFormat: string;
  selectedDecade: string;
  selectedTop4000: string;
  onGenreChange: (v: string) => void;
  onFormatChange: (v: string) => void;
  onDecadeChange: (v: string) => void;
  onTop4000Change: (v: string) => void;
  onClear: () => void;
}

const DECADES = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];

export function FilterPanel({
  genres,
  formats,
  selectedGenre,
  selectedFormat,
  selectedDecade,
  selectedTop4000,
  onGenreChange,
  onFormatChange,
  onDecadeChange,
  onTop4000Change,
  onClear,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const hasFilters = selectedGenre || selectedFormat || selectedDecade || selectedTop4000;

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(!open)}
          className={`btn-secondary text-sm ${hasFilters ? "border-groove text-groove" : ""}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasFilters && (
            <span className="w-5 h-5 rounded-full bg-groove text-white text-xs flex items-center justify-center">
              {[selectedGenre, selectedFormat, selectedDecade, selectedTop4000].filter(Boolean).length}
            </span>
          )}
        </button>
        {hasFilters && (
          <button onClick={onClear} className="text-xs text-ink-400 hover:text-ink-200 flex items-center gap-1">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 p-4 card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-ink-400 mb-1.5">Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => onGenreChange(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-400 mb-1.5">Format</label>
            <select
              value={selectedFormat}
              onChange={(e) => onFormatChange(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All formats</option>
              {formats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-400 mb-1.5">Decade</label>
            <select
              value={selectedDecade}
              onChange={(e) => onDecadeChange(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All decades</option>
              {DECADES.map((d) => (
                <option key={d} value={d.replace("s", "")}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-ink-400 mb-1.5">Top 4000</label>
            <select
              value={selectedTop4000}
              onChange={(e) => onTop4000Change(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All</option>
              <option value="yes">In Top 4000</option>
              <option value="no">Not in Top 4000</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
