"use client";

import { useEffect, useState } from "react";
import { Disc3, Users, Euro, Clock, Trophy, Music, Shuffle } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { MusicCard } from "@/components/music-card";
import { CoverImage } from "@/components/cover-image";
import { PageSkeleton } from "@/components/loading";
import { fetchStats, fetchTotalPlaytime, fetchRecentSongs, fetchRandomSong, fetchDecadeDistribution } from "@/lib/queries";
import { formatDuration, formatPrice } from "@/lib/utils";
import type { Song, CollectionStats } from "@/lib/types";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [playtime, setPlaytime] = useState(0);
  const [recent, setRecent] = useState<Song[]>([]);
  const [featured, setFeatured] = useState<Song | null>(null);
  const [decades, setDecades] = useState<{ decade: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [s, pt, r, f, d] = await Promise.all([
        fetchStats(),
        fetchTotalPlaytime(),
        fetchRecentSongs(6),
        fetchRandomSong(),
        fetchDecadeDistribution(),
      ]);
      setStats(s);
      setPlaytime(pt);
      setRecent(r);
      setFeatured(f);
      setDecades(d);
      setLoading(false);
    }
    load();
  }, []);

  const pickRandom = async () => {
    const s = await fetchRandomSong();
    setFeatured(s);
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-ink-400 mt-1">Your music collection at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total records" value={stats?.total_songs ?? 0} icon={Disc3} />
        <StatCard label="Artists" value={stats?.total_artists ?? 0} icon={Users} />
        <StatCard
          label="Collection value"
          value={formatPrice(stats?.total_value ?? 0)}
          icon={Euro}
          accent="text-emerald-400"
        />
        <StatCard label="Total playtime" value={formatDuration(playtime)} icon={Clock} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="In Top 4000" value={stats?.top4000_count ?? 0} icon={Trophy} accent="text-amber-400" />
        <StatCard label="Genres" value={stats?.total_genres ?? 0} icon={Music} />
        <StatCard
          label="Year range"
          value={stats ? `${stats.earliest_year}–${stats.latest_year}` : "—"}
          icon={Clock}
          accent="text-purple-400"
        />
        <StatCard label="With covers" value={stats?.with_covers ?? 0} icon={Disc3} accent="text-sky-400" />
      </div>

      {/* Featured / Random */}
      {featured && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-white">Pick something to listen to</h2>
            <button onClick={pickRandom} className="btn-secondary text-sm">
              <Shuffle className="w-4 h-4" /> Shuffle
            </button>
          </div>
          <Link href={`/music/${featured.id}`} className="flex items-center gap-4 group">
            <CoverImage coverPath={featured.cover_path} alt={featured.title} size="lg" />
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-groove transition-colors">
                {featured.title}
              </h3>
              <p className="text-ink-400">{featured.artist}</p>
              <p className="text-ink-500 text-sm mt-1">
                {featured.year || "—"} · {featured.format}
              </p>
              {featured.top4000 && (
                <span className="badge bg-amber-500/10 text-amber-400 mt-2">Top 4000</span>
              )}
            </div>
          </Link>
        </div>
      )}

      {/* Decade distribution bar */}
      {decades.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-bold text-lg text-white mb-4">Collection by decade</h2>
          <div className="space-y-2">
            {decades.map(({ decade, count }) => {
              const max = Math.max(...decades.map((d) => d.count));
              const pct = (count / max) * 100;
              return (
                <div key={decade} className="flex items-center gap-3">
                  <span className="text-xs text-ink-400 w-12 text-right font-mono">{decade}</span>
                  <div className="flex-1 h-6 bg-ink-800 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-groove to-groove-light rounded transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-400 w-10 font-mono">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently added */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-white">Recently added</h2>
            <Link href="/music" className="text-sm text-groove hover:text-groove-light transition-colors">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recent.map((song) => (
              <MusicCard key={song.id} song={song} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
