"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit, Trash2, Calendar, Disc3, MapPin, Tag,
  Star, TrendingUp, FileText
} from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import { MusicCard } from "@/components/music-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageSkeleton } from "@/components/loading";
import { fetchSongById, fetchSongsByArtist, deleteSong } from "@/lib/queries";
import { formatPrice } from "@/lib/utils";
import { useAdmin } from "@/lib/admin-context";
import type { Song } from "@/lib/types";

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [song, setSong] = useState<Song | null>(null);
  const [related, setRelated] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    async function load() {
      const s = await fetchSongById(id);
      setSong(s);
      if (s) {
        const rel = await fetchSongsByArtist(s.artist);
        setRelated(rel.filter((r) => r.id !== s.id).slice(0, 6));
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleDelete = async () => {
    if (!song) return;
    await deleteSong(song.id);
    router.push("/music");
  };

  if (loading) return <PageSkeleton />;
  if (!song) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-white">Song not found</h1>
        <Link href="/music" className="text-groove hover:text-groove-light mt-4 inline-block">
          ← Back to collection
        </Link>
      </div>
    );
  }

  // Build ranking history
  const rankings = [
    { year: 2023, pos: song.top2023 },
    { year: 2024, pos: song.top2024 },
    { year: 2025, pos: song.top2025 },
    { year: 2026, pos: song.top2026 },
  ].filter((r) => r.pos != null);

  return (
    <div className="space-y-8">
      {/* Back button */}
      <button onClick={() => router.back()} className="text-ink-400 hover:text-ink-200 flex items-center gap-2 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero section */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <div className="flex-shrink-0">
          <CoverImage
            coverPath={song.cover_path}
            alt={`${song.title} by ${song.artist}`}
            size="xl"
            className="max-w-xs md:max-w-sm w-full"
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white">{song.title}</h1>
              <Link
                href={`/artists/${encodeURIComponent(song.artist)}`}
                className="text-xl text-ink-300 hover:text-groove transition-colors mt-1 inline-block"
              >
                {song.artist}
              </Link>
            </div>
            {isAdmin && (
              <div className="flex gap-2 flex-shrink-0">
                <Link href={`/admin/edit/${song.id}`} className="btn-secondary text-sm">
                  <Edit className="w-4 h-4" /> Edit
                </Link>
                <button onClick={() => setShowDelete(true)} className="p-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Meta info */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            {song.year && (
              <div className="flex items-center gap-2 text-ink-300">
                <Calendar className="w-4 h-4 text-ink-500" />
                <span>{song.year}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-ink-300">
              <Disc3 className="w-4 h-4 text-ink-500" />
              <span>{song.format}</span>
            </div>
            {song.country && (
              <div className="flex items-center gap-2 text-ink-300">
                <MapPin className="w-4 h-4 text-ink-500" />
                <span>{song.country}</span>
              </div>
            )}
            {song.genre && (
              <div className="flex items-center gap-2 text-ink-300">
                <Tag className="w-4 h-4 text-ink-500" />
                <span>{song.genre}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-ink-300">
              <Star className="w-4 h-4 text-ink-500" />
              <span>{song.original === "Yes" ? "Original" : "Copy"}</span>
            </div>
            {song.price_eur != null && song.price_eur > 0 && (
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                €{song.price_eur.toFixed(2).replace(".", ",")}
              </div>
            )}
          </div>

          {/* Top 4000 badges */}
          {song.top4000 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="badge bg-amber-500/10 text-amber-400">Top 4000</span>
              {rankings.map((r) => (
                <span key={r.year} className="badge bg-ink-800 text-ink-300">
                  {r.year}: #{r.pos}
                </span>
              ))}
            </div>
          )}

          {/* Ranking history chart (simple) */}
          {rankings.length >= 2 && (
            <div className="mt-4 card p-4">
              <h3 className="text-sm font-medium text-ink-400 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Ranking history
              </h3>
              <div className="flex items-end gap-3 h-24">
                {rankings.map((r) => {
                  // Invert: lower position = taller bar. Max 4000.
                  const height = Math.max(10, ((4000 - (r.pos || 4000)) / 4000) * 100);
                  return (
                    <div key={r.year} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-xs text-white font-mono">#{r.pos}</span>
                      <div
                        className="w-full bg-gradient-to-t from-groove to-groove-light rounded-t"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-ink-500">{r.year}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tracklist */}
      {song.tracklist && (
        <div className="card p-5">
          <h2 className="font-display font-bold text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-ink-500" /> Tracklist
          </h2>
          <div className="text-ink-300 whitespace-pre-line leading-relaxed text-sm">
            {song.tracklist}
          </div>
        </div>
      )}

      {/* Description */}
      {song.description && (
        <div className="card p-5">
          <h2 className="font-display font-bold text-white mb-3">Notes</h2>
          <p className="text-ink-300 text-sm leading-relaxed">{song.description}</p>
        </div>
      )}

      {/* Related songs by same artist */}
      {related.length > 0 && (
        <div>
          <h2 className="font-display font-bold text-lg text-white mb-4">
            More by {song.artist}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {related.map((r) => (
              <MusicCard key={r.id} song={r} />
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Delete this record?"
        message={`"${song.title}" by ${song.artist} will be permanently removed.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
