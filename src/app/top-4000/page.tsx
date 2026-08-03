"use client";

import { useEffect, useState, useCallback } from "react";
import { ListMusic } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { Pagination } from "@/components/pagination";
import { TableSkeleton } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { fetchTop4000List, fetchAvailableTop4000Years } from "@/lib/queries";
import type { Top4000Entry } from "@/lib/types";

const PAGE_SIZE = 100;

export default function Top4000ListsPage() {
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [entries, setEntries] = useState<Top4000Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableTop4000Years().then((y) => {
      setYears(y);
      if (y.length > 0) setSelectedYear(y[y.length - 1]);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { entries: data, total: t } = await fetchTop4000List(
      selectedYear,
      search || undefined,
      page,
      PAGE_SIZE
    );
    setEntries(data);
    setTotal(t);
    setLoading(false);
  }, [selectedYear, search, page]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [selectedYear, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-sky-500/10">
          <ListMusic className="w-6 h-6 text-sky-400" />
        </div>
        <div>
          <h1 className="page-title">Top 4000 Lists</h1>
          <p className="text-ink-400 mt-0.5">
            Browse the full radio Top 4000 by year — {total.toLocaleString()} songs
          </p>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex items-center gap-2">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              y === selectedYear
                ? "bg-groove text-white"
                : "bg-ink-800 text-ink-400 hover:text-ink-200"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search artist or title…" />

      {loading ? (
        <TableSkeleton rows={20} />
      ) : entries.length === 0 ? (
        <EmptyState title="No entries found" description="Try a different search" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-ink-400 text-left">
                <th className="px-4 py-3 font-medium w-16 text-center">#</th>
                <th className="px-4 py-3 font-medium">Artist</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium w-20">Year</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-ink-800/50 hover:bg-ink-800/30 transition-colors"
                >
                  <td className="px-4 py-3 text-center font-mono text-ink-500">{entry.position}</td>
                  <td className="px-4 py-3 text-white font-medium">{entry.artist}</td>
                  <td className="px-4 py-3 text-ink-300">{entry.title}</td>
                  <td className="px-4 py-3 text-ink-500">{entry.song_year || "—"}</td>
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
