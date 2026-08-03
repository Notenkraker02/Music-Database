"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { EmptyState } from "@/components/empty-state";
import { fetchArtists } from "@/lib/queries";
import { getFirstLetter, plural } from "@/lib/utils";
import type { ArtistSummary } from "@/lib/types";

const ALPHABET = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

export default function ArtistsPage() {
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [search, setSearch] = useState("");
  const [jumpLetter, setJumpLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      const data = await fetchArtists(search || undefined);
      setArtists(data);
      setLoading(false);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  // Group by first letter
  const grouped: Record<string, ArtistSummary[]> = {};
  for (const a of artists) {
    const letter = getFirstLetter(a.artist);
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(a);
  }
  const letters = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Artists</h1>
        <p className="text-ink-400 mt-1">{plural(artists.length, "artist")} in your collection</p>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search artists…" />

      {/* Alphabet jump */}
      <div className="flex flex-wrap gap-1">
        {ALPHABET.map((l) => {
          const exists = letters.includes(l);
          return (
            <button
              key={l}
              onClick={() => {
                if (exists) {
                  setJumpLetter(jumpLetter === l ? null : l);
                  if (jumpLetter !== l) {
                    document.getElementById(`letter-${l}`)?.scrollIntoView({ behavior: "smooth" });
                  }
                }
              }}
              className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
                jumpLetter === l
                  ? "bg-groove text-white"
                  : exists
                  ? "bg-ink-800 text-ink-300 hover:bg-ink-700"
                  : "bg-ink-900 text-ink-700 cursor-default"
              }`}
            >
              {l}
            </button>
          );
        })}
        {jumpLetter && (
          <button
            onClick={() => setJumpLetter(null)}
            className="px-3 h-8 rounded text-xs text-ink-400 hover:text-ink-200 border border-ink-700"
          >
            Show all
          </button>
        )}
      </div>

      {/* Artist list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="skeleton h-6 w-48" />
          ))}
        </div>
      ) : artists.length === 0 ? (
        <EmptyState title="No artists found" description="Try a different search" />
      ) : (
        <div className="space-y-8">
          {letters
            .filter((l) => !jumpLetter || l === jumpLetter)
            .map((letter) => (
              <div key={letter} id={`letter-${letter}`}>
                <h2 className="font-display font-bold text-groove text-xl mb-3 sticky top-0 bg-ink-950 py-2 z-10">
                  {letter}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {grouped[letter].map((a) => (
                    <Link
                      key={a.artist}
                      href={`/artists/${encodeURIComponent(a.artist)}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-ink-800/50 transition-colors group"
                    >
                      <span className="text-ink-200 group-hover:text-white transition-colors truncate">
                        {a.artist}
                      </span>
                      <span className="text-xs text-ink-500 flex-shrink-0 ml-2">
                        {a.count}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
