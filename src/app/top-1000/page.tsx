"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { SearchBar } from "@/components/search-bar";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading";
import { fetchTop1000 } from "@/lib/queries";
import type { Top1000Entry } from "@/lib/types";

export default function Top1000Page() {
  const [entries, setEntries] = useState<Top1000Entry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await fetchTop1000(search || undefined);
      setEntries(data);
      setLoading(false);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-amber-500/10">
          <Trophy className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="page-title">My Top 1000</h1>
          <p className="text-ink-400 mt-0.5">
            Your personal ranking — {entries.length} entries
          </p>
        </div>
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
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-mono font-bold ${
                        entry.position <= 10
                          ? "text-amber-400"
                          : entry.position <= 100
                          ? "text-ink-200"
                          : "text-ink-500"
                      }`}
                    >
                      {entry.position}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{entry.artist}</td>
                  <td className="px-4 py-3 text-ink-300">{entry.title}</td>
                  <td className="px-4 py-3 text-ink-500">{entry.year || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
