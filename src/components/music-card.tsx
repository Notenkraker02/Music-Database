import Link from "next/link";
import { CoverImage } from "./cover-image";
import { formatPrice } from "@/lib/utils";
import type { Song } from "@/lib/types";

export function MusicCard({ song }: { song: Song }) {
  return (
    <Link href={`/music/${song.id}`} className="card-hover group block">
      <CoverImage
        coverPath={song.cover_path}
        alt={`${song.title} by ${song.artist}`}
        size="xl"
        className="rounded-b-none"
      />
      <div className="p-3">
        <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 group-hover:text-groove transition-colors">
          {song.title}
        </h3>
        <p className="text-ink-400 text-xs mt-1 truncate">{song.artist}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-ink-500">
            {song.year || "—"} · {song.format === "Vinyl 7 Inch 45 RPM" ? "7″ 45" : song.format}
          </span>
          {song.price_eur && song.price_eur > 0 && (
            <span className="text-xs font-medium text-emerald-400">
              {formatPrice(song.price_eur)}
            </span>
          )}
        </div>
        {song.top4000 && (
          <span className="badge bg-amber-500/10 text-amber-400 mt-2">
            Top 4000
          </span>
        )}
      </div>
    </Link>
  );
}
