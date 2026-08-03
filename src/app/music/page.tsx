"use client";

import { useEffect, useState, useCallback } from "react";
import { Grid3X3, List, ArrowUpDown } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { FilterPanel } from "@/components/filter-panel";
import { MusicCard } from "@/components/music-card";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { CardGridSkeleton, TableSkeleton } from "@/components/loading";
import { fetchSongs, fetchDistinctValues } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";
import type { Song, SortField, SortDir } from "@/lib/types";
import Link from "next/link";

const PAGE_SIZE = 48;

export default function MusicPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("");
  const [decade, setDecade] = useState("");
  const [top4000Filter, setTop4000Filter] = useState("");
  const [sortField, setSortField] = useState<SortField>("artist");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<string[]>([]);
  const [formats, setFormats] = useState<string[]>([]);

  // Load filter options once
  useEffect(() => {
    fetchDistinctValues("genre").then(setGenres);
    fetchDistinctValues("format").then(setFormats);
  }, []);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    const { songs: data, total: t } = await fetchSongs({
      search: search || undefined,
      genre: genre || undefined,
      format: format || undefined,
      decade: decade || undefined,
      top4000: top4000Filter === "yes" ? true : top4000Filter === "no" ? false : undefined,
      sortField,
      sortDir,
      page,
      pageSize: PAGE_SIZE,
    });
    setSongs(data);
    setTotal(t);
    setLoading(false);
  }, [search, genre, format, decade, top4000Filter, sortField, sortDir, page]);

  useEffect(() => {
    const timer = setTimeout(loadSongs, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadSongs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, genre, format, decade, top4000Filter, sortField, sortDir]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const clearFilters = () => {
    setGenre("");
    setFormat("");
    setDecade("");
    setTop4000Filter("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">All Music</h1>
        <p className="text-ink-400 mt-1">
          {total.toLocaleString()} records in your collection
        </p>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <SearchBar value={search} onChange={setSearch} />
        <div className="flex items-center gap-3 flex-wrap">
          <FilterPanel
            genres={genres}
            formats={formats}
            selectedGenre={genre}
            selectedFormat={format}
            selectedDecade={decade}
            selectedTop4000={top4000Filter}
            onGenreChange={setGenre}
            onFormatChange={setFormat}
            onDecadeChange={setDecade}
            onTop4000Change={setTop4000Filter}
            onClear={clearFilters}
          />
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg transition-colors ${
                view === "grid" ? "bg-ink-700 text-white" : "text-ink-500 hover:text-ink-300"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("table")}
              className={`p-2 rounded-lg transition-colors ${
                view === "table" ? "bg-ink-700 text-white" : "text-ink-500 hover:text-ink-300"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sort bar */}
      <div className="flex items-center gap-4 text-xs text-ink-500">
        <span>Sort by:</span>
        {(["artist", "title", "year", "price_eur", "created_at"] as SortField[]).map((f) => (
          <button
            key={f}
            onClick={() => toggleSort(f)}
            className={`flex items-center gap-1 hover:text-ink-200 transition-colors ${
              sortField === f ? "text-groove font-medium" : ""
            }`}
          >
            {f === "price_eur" ? "Price" : f === "created_at" ? "Date added" : f.charAt(0).toUpperCase() + f.slice(1)}
            {sortField === f && (
              <ArrowUpDown className="w-3 h-3" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        view === "grid" ? <CardGridSkeleton /> : <TableSkeleton />
      ) : songs.length === 0 ? (
        <EmptyState
          title="No records found"
          description="Try adjusting your search or filters"
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {songs.map((song) => (
            <MusicCard key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-ink-400 text-left">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Artist</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr
                  key={song.id}
                  className="border-b border-ink-800/50 hover:bg-ink-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/music/${song.id}`}
                      className="text-white hover:text-groove transition-colors font-medium"
                    >
                      {song.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-400">
                    <Link
                      href={`/artists/${encodeURIComponent(song.artist)}`}
                      className="hover:text-groove transition-colors"
                    >
                      {song.artist}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-500">{song.year || "—"}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {song.format === "Vinyl 7 Inch 45 RPM" ? "7″ 45" : song.format}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-400">
                    {formatPrice(song.price_eur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
