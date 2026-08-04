"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Edit, Trash2, FileText
} from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import { MusicCard } from "@/components/music-card";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageSkeleton } from "@/components/loading";
import { fetchSongById, fetchSongsByArtist, deleteSong } from "@/lib/queries";
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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Back button */}
      <button onClick={() => router.back()} className="text-ink-400 hover:text-ink-200 flex items-center gap-2 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="card p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          
          {/* Left Column: Cover */}
          <div className="w-full md:w-1/3 flex-shrink-0">
            <CoverImage
              coverPath={song.cover_path}
              alt={`${song.title} by ${song.artist}`}
              size="xl"
              className="w-full shadow-2xl rounded-lg border border-ink-800"
            />
          </div>

          {/* Right Column: Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">{song.title}</h1>
                <Link
                  href={`/artists/${encodeURIComponent(song.artist)}`}
                  className="text-xl text-groove hover:text-groove-light transition-colors inline-block font-medium"
                >
                  {song.artist}
                </Link>
              </div>
              
              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={`/admin/edit/${song.id}`} className="btn-secondary text-sm h-10">
                    <Edit className="w-4 h-4" /> Edit
                  </Link>
                  <button onClick={() => setShowDelete(true)} className="p-2.5 h-10 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Structured Data Grid (similar to add/edit view) */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4 pt-8 mt-6 border-t border-ink-800/50">
              <DetailItem label="Year" value={song.year} />
              <DetailItem label="Genre" value={song.genre} />
              <DetailItem label="Format" value={song.format} />
              <DetailItem label="Country" value={song.country} />
              <DetailItem label="Original" value={song.original === "Yes" ? "Yes" : "Copy"} />
              <DetailItem 
                label="Estimated Value" 
                value={song.price_eur != null && song.price_eur > 0 ? `€${song.price_eur.toFixed(2).replace(".", ",")}` : undefined} 
              />
            </div>
            
            {/* Top 4000 simple badge (Optional: kept just as a yes/no indicator) */}
            {song.top4000 && (
              <div className="pt-6 mt-6 border-t border-ink-800/50">
                <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Top 4000 List Featured
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tracklist */}
        {song.tracklist && (
          <div className="card p-6 h-full">
            <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-ink-500" /> Tracklist
            </h2>
            <div className="text-ink-300 whitespace-pre-line leading-relaxed text-sm font-mono bg-ink-900/50 p-4 rounded-lg border border-ink-800/50">
              {song.tracklist}
            </div>
          </div>
        )}

        {/* Description / Notes */}
        {song.description && (
          <div className="card p-6 h-full">
            <h2 className="font-display font-bold text-white mb-4">Notes</h2>
            <p className="text-ink-300 text-sm leading-relaxed bg-ink-900/50 p-4 rounded-lg border border-ink-800/50">
              {song.description}
            </p>
          </div>
        )}
      </div>

      {/* Related songs by same artist */}
      {related.length > 0 && (
        <div className="pt-4">
          <h2 className="font-display font-bold text-xl text-white mb-6">
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

// Small helper for the structured grid view
function DetailItem({ label, value }: { label: string; value: string | number | undefined | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div>
      <span className="block text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1.5">{label}</span>
      <span className="block text-sm text-ink-100 font-medium">{value}</span>
    </div>
  );
}