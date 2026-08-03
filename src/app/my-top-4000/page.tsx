"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, CheckCircle2, Circle } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { Pagination } from "@/components/pagination";
import { TableSkeleton } from "@/components/loading";
import { fetchTop4000List, fetchMyTop4000Positions, fetchAvailableTop4000Years } from "@/lib/queries";
import type { Top4000Entry } from "@/lib/types";

const PAGE_SIZE = 100;

export default function MyTop4000Page() {
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [entries, setEntries] = useState<Top4000Entry[]>([]);
  const [ownedPositions, setOwnedPositions] = useState<Set<number>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAvailableTop4000Years().then((y) => {
      setYears(y);
      if (y.length > 0 && !y.includes(selectedYear)) setSelectedYear(y[y.length - 1]);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ entries: data, total: t }, positions] = await Promise.all([
      fetchTop4000List(selectedYear, search || undefined, page, PAGE_SIZE),
      fetchMyTop4000Positions(selectedYear),
    ]);
    setEntries(data);
    setTotal(t);
    setOwnedPositions(new Set(positions));
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
  const ownedCount = ownedPositions.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-purple-500/10">
          <Star className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="page-title">My Top 4000</h1>
          <p className="text-ink-400 mt-0.5">
            You own <span className="text-white font-semibold">{ownedCount}</span> songs from the {selectedYear} list
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

      {/* Owned percentage bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-ink-400">Collection coverage</span>
          <span className="text-white font-medium">
            {ownedCount} / 4,000 ({((ownedCount / 4000) * 100).toFixed(1)}%)
          </span>
        </div>
        <div className="h-3 bg-ink-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-groove to-groove-light rounded-full transition-all"
            style={{ width: `${(ownedCount / 4000) * 100}%` }}
          />
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={20} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-ink-400 text-left">
                <th className="px-4 py-3 font-medium w-16 text-center">#</th>
                <th className="px-4 py-3 font-medium w-12 text-center">Owned</th>
                <th className="px-4 py-3 font-medium">Artist</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium w-20">Year</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const owned = ownedPositions.has(entry.position);
                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-ink-800/50 transition-colors ${
                      owned ? "bg-emerald-500/5" : "hover:bg-ink-800/30"
                    }`}
                  >
                    <td className="px-4 py-3 text-center font-mono text-ink-500">
                      {entry.position}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {owned ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                      ) : (
                        <Circle className="w-4 h-4 text-ink-700 mx-auto" />
                      )}
                    </td>
                    <td className={`px-4 py-3 font-medium ${owned ? "text-white" : "text-ink-400"}`}>
                      {entry.artist}
                    </td>
                    <td className={`px-4 py-3 ${owned ? "text-ink-200" : "text-ink-500"}`}>
                      {entry.title}
                    </td>
                    <td className="px-4 py-3 text-ink-500">{entry.song_year || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
