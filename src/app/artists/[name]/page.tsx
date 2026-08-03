"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Grid3X3, List, ArrowUpDown, PlusCircle } from "lucide-react";
import { MusicCard } from "@/components/music-card";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { PageSkeleton } from "@/components/loading";
import { fetchSongsByArtist } from "@/lib/queries";
import { formatPrice, formatDuration, parseTracklistDuration, plural } from "@/lib/utils";
import { useAdmin } from "@/lib/admin-context";
import type { Song } from "@/lib/types";
import Link from "next/link";
import { Music, Euro, Clock } from "lucide-react";

export default function ArtistDetailPage() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const artistName = decodeURIComponent(params.name);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"year" | "title">("year");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    fetchSongsByArtist(artistName).then((data) => {
      setSongs(data);
      setLoading(false);
    });
  }, [artistName]);

  if (loading) return <PageSkeleton />;

  const totalValue = songs.reduce((s, r) => s + (r.price_eur || 0), 0);
  const totalSeconds = songs.reduce((s, r) => s + parseTracklistDuration(r.tracklist), 0);

  const sorted = [...songs].sort((a, b) => {
    if (sort === "title") return (a.title || "").localeCompare(b.title || "");
    return (a.year || 9999) - (b.year || 9999);
  });

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="text-ink-400 hover:text-ink-200 flex items-center gap-2 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{artistName}</h1>
          <p className="text-ink-400 mt-1">{plural(songs.length, "record")}</p>
        </div>
        {isAdmin && (
          <Link href={`/admin/add?artist=${encodeURIComponent(artistName)}`} className="btn-primary text-sm">
            <PlusCircle className="w-4 h-4" /> Add record
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Records" value={songs.length} icon={Music} />
        <StatCard label="Total value" value={formatPrice(totalValue)} icon={Euro} accent="text-emerald-400" />
        <StatCard label="Playtime" value={formatDuration(totalSeconds)} icon={Clock} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-ink-800 rounded-lg p-0.5">
          <button
            onClick={() => setSort("year")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              sort === "year" ? "bg-ink-700 text-white" : "text-ink-400 hover:text-ink-200"
            }`}
          >
            Chronological
          </button>
          <button
            onClick={() => setSort("title")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              sort === "title" ? "bg-ink-700 text-white" : "text-ink-400 hover:text-ink-200"
            }`}
          >
            A–Z
          </button>
        </div>
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
            onClick={() => setView("list")}
            className={`p-2 rounded-lg transition-colors ${
              view === "list" ? "bg-ink-700 text-white" : "text-ink-500 hover:text-ink-300"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Songs */}
      {songs.length === 0 ? (
        <EmptyState title="No records found" description={`No records by ${artistName}`} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {sorted.map((song) => (
            <MusicCard key={song.id} song={song} />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {sorted.map((song) => (
            <Link
              key={song.id}
              href={`/music/${song.id}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-ink-800/50 transition-colors group"
            >
              <span className="text-ink-500 text-sm w-12">{song.year || "—"}</span>
              <span className="text-ink-200 group-hover:text-groove transition-colors flex-1 truncate">
                {song.title}
              </span>
              <span className="text-ink-500 text-xs">{song.format === "Vinyl 7 Inch 45 RPM" ? "7″ 45" : song.format}</span>
              {song.price_eur && song.price_eur > 0 && (
                <span className="text-emerald-400 text-xs font-medium w-16 text-right">
                  {formatPrice(song.price_eur)}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
