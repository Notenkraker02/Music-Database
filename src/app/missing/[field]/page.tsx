"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Pencil } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { EmptyState } from "@/components/empty-state";
import { TableSkeleton } from "@/components/loading";
import { fetchSongsMissing, type MissingField } from "@/lib/queries";
import { useAdmin } from "@/lib/admin-context";
import { formatPrice } from "@/lib/utils";
import type { Song } from "@/lib/types";

const PAGE_SIZE = 48;

const FIELD_META: Record<MissingField, { title: string; blurb: string }> = {
  year: {
    title: "Records missing a year",
    blurb: "These records have no release year set.",
  },
  price: {
    title: "Records missing a price",
    blurb: "These records have no price (or a price of 0) set.",
  },
  cover: {
    title: "Records missing a cover",
    blurb: "These records have no cover image.",
  },
};

const VALID: MissingField[] = ["year", "price", "cover"];

export default function MissingFieldPage() {
  const params = useParams();
  const field = params.field as string;
  const { isAdmin } = useAdmin();

  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const isValid = VALID.includes(field as MissingField);

  const load = useCallback(async () => {
    if (!isValid) return;
    setLoading(true);
    const { songs: data, total: t } = await fetchSongsMissing(
      field as MissingField,
      page,
      PAGE_SIZE
    );
    setSongs(data);
    setTotal(t);
    setLoading(false);
  }, [field, page, isValid]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isValid) return notFound();

  const meta = FIELD_META[field as MissingField];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/insights"
          className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-groove transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Insights
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10">
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="page-title">{meta.title}</h1>
            <p className="text-ink-400 mt-1">
              {total.toLocaleString()} records · {meta.blurb}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <TableSkeleton />
      ) : songs.length === 0 ? (
        <EmptyState
          title="Nothing missing here"
          description="Every record already has this field filled in."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-800 text-ink-400 text-left">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Artist</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr
                  key={song.id}
                  className="border-b border-ink-800/50 hover:bg-ink-800/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/music/${song.id}`}
                      className="text-white hover:text-groove transition-colors font-medium"
                    >
                      {song.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-400">{song.artist}</td>
                  <td className="px-4 py-3 text-ink-500">{song.year || "—"}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {song.format === "Vinyl 7 Inch 45 RPM" ? "7″ 45" : song.format}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-400">
                    {formatPrice(song.price_eur)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={isAdmin ? `/admin/edit/${song.id}` : `/music/${song.id}`}
                      className="inline-flex items-center gap-1 text-groove hover:text-groove-light transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      {isAdmin ? "Edit" : "Open"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isAdmin && songs.length > 0 && (
        <p className="text-xs text-ink-500">
          Tip: log in as admin on the Settings page to edit records directly from here.
        </p>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
