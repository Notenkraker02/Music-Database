"use client";

import { useEffect, useState } from "react";
import { BarChart3, Shuffle, AlertCircle } from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import { PageSkeleton } from "@/components/loading";
import { fetchSongs, fetchDecadeDistribution, fetchRandomSong, fetchStats, fetchArtists } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";
import type { Song, CollectionStats, ArtistSummary } from "@/lib/types";
import Link from "next/link";

export default function InsightsPage() {
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [decades, setDecades] = useState<{ decade: string; count: number }[]>([]);
  const [topArtists, setTopArtists] = useState<ArtistSummary[]>([]);
  const [mostValuable, setMostValuable] = useState<Song[]>([]);
  const [missingYear, setMissingYear] = useState(0);
  const [missingGenre, setMissingGenre] = useState(0);
  const [missingPrice, setMissingPrice] = useState(0);
  const [randomSong, setRandomSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, d, artists, expensive] = await Promise.all([
        fetchStats(),
        fetchDecadeDistribution(),
        fetchArtists(),
        fetchSongs({ sortField: "price_eur", sortDir: "desc", pageSize: 10 }),
      ]);
      setStats(s);
      setDecades(d);
      setTopArtists(artists.sort((a, b) => b.count - a.count).slice(0, 15));
      setMostValuable(expensive.songs);

      // Count missing data
      const allRes = await fetchSongs({ pageSize: 5000 });
      const all = allRes.songs;
      setMissingYear(all.filter((s) => !s.year).length);
      setMissingGenre(all.filter((s) => !s.genre).length);
      setMissingPrice(all.filter((s) => !s.price_eur || s.price_eur === 0).length);

      const r = await fetchRandomSong();
      setRandomSong(r);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-violet-500/10">
          <BarChart3 className="w-6 h-6 text-violet-400" />
        </div>
        <h1 className="page-title">Collection Insights</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Decade chart */}
        <div className="card p-5">
          <h2 className="font-display font-bold text-white mb-4">By decade</h2>
          <div className="space-y-2">
            {decades.map(({ decade, count }) => {
              const max = Math.max(...decades.map((d) => d.count));
              return (
                <div key={decade} className="flex items-center gap-3">
                  <span className="text-xs text-ink-400 w-12 text-right font-mono">{decade}</span>
                  <div className="flex-1 h-5 bg-ink-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded transition-all"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-400 w-8 font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top artists */}
        <div className="card p-5">
          <h2 className="font-display font-bold text-white mb-4">Most collected artists</h2>
          <div className="space-y-1">
            {topArtists.map((a, i) => (
              <Link
                key={a.artist}
                href={`/artists/${encodeURIComponent(a.artist)}`}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-ink-800/50 transition-colors"
              >
                <span className="text-xs font-mono text-ink-500 w-5">{i + 1}</span>
                <span className="text-ink-200 flex-1 truncate text-sm">{a.artist}</span>
                <span className="text-xs font-medium text-groove">{a.count}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Most valuable */}
        <div className="card p-5">
          <h2 className="font-display font-bold text-white mb-4">Most valuable records</h2>
          <div className="space-y-1">
            {mostValuable.filter((s) => s.price_eur && s.price_eur > 0).map((song, i) => (
              <Link
                key={song.id}
                href={`/music/${song.id}`}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-ink-800/50 transition-colors"
              >
                <span className="text-xs font-mono text-ink-500 w-5">{i + 1}</span>
                <span className="text-ink-200 flex-1 truncate text-sm">
                  {song.title} — <span className="text-ink-400">{song.artist}</span>
                </span>
                <span className="text-sm font-medium text-emerald-400">{formatPrice(song.price_eur)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Data quality */}
        <div className="card p-5">
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" /> Missing data
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-400">Missing year</span>
              <span className="text-sm text-white font-medium">{missingYear} records</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-400">Missing genre</span>
              <span className="text-sm text-white font-medium">{missingGenre} records</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-400">Missing price</span>
              <span className="text-sm text-white font-medium">{missingPrice} records</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-400">Missing cover</span>
              <span className="text-sm text-white font-medium">
                {stats ? stats.total_songs - stats.with_covers : 0} records
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Random pick */}
      {randomSong && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-white">Hidden gem</h2>
            <button
              onClick={async () => setRandomSong(await fetchRandomSong())}
              className="btn-secondary text-sm"
            >
              <Shuffle className="w-4 h-4" /> Pick another
            </button>
          </div>
          <Link href={`/music/${randomSong.id}`} className="flex items-center gap-4 group">
            <CoverImage coverPath={randomSong.cover_path} alt={randomSong.title} size="lg" />
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-groove transition-colors">
                {randomSong.title}
              </h3>
              <p className="text-ink-400">{randomSong.artist}</p>
              <p className="text-ink-500 text-sm mt-1">{randomSong.year || "—"}</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
