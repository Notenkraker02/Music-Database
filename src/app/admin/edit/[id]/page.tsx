"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Edit, Upload, CheckCircle2, ArrowLeft } from "lucide-react";
import { fetchSongById, updateSong } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/lib/admin-context";
import { FORMAT_OPTIONS } from "@/lib/types";
import type { Song } from "@/lib/types";
import { PageSkeleton } from "@/components/loading";
import { autofillRankingsFromAnchors } from "@/lib/top4000-sync";

async function autofillRankings(artist: string, title: string, rankings: any) {
  const { data } = await supabase
    .from("top4000_lists")
    .select("list_year,position")
    .ilike("artist", artist)
    .ilike("title", title);

  if (!data) return rankings;

  const updated = { ...rankings };

  for (const row of data) {
    if (row.list_year === 2023 && !updated.top2023) updated.top2023 = row.position;
    if (row.list_year === 2024 && !updated.top2024) updated.top2024 = row.position;
    if (row.list_year === 2025 && !updated.top2025) updated.top2025 = row.position;
    if (row.list_year === 2026 && !updated.top2026) updated.top2026 = row.position;
  }

  return updated;
}

export default function EditMusicPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin, login } = useAdmin();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);

  const [artist, setArtist] = useState("");
  const [title, setTitle] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [format, setFormat] = useState("Vinyl 7 Inch 45 RPM");
  const [country, setCountry] = useState("");
  const [original, setOriginal] = useState("Yes");
  const [top4000, setTop4000] = useState(false);
  const [tracklist, setTracklist] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [top2023, setTop2023] = useState("");
  const [top2024, setTop2024] = useState("");
  const [top2025, setTop2025] = useState("");
  const [top2026, setTop2026] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSongById(id).then((s) => {
      if (s) {
        setSong(s);
        setArtist(s.artist);
        setTitle(s.title);
        setYear(s.year?.toString() || "");
        setGenre(s.genre || "");
        setFormat(s.format);
        setCountry(s.country || "");
        setOriginal(s.original);
        setTop4000(s.top4000);
        setTracklist(s.tracklist || "");
        setDescription(s.description || "");
        setPrice(s.price_raw || "");
        setTop2023(s.top2023?.toString() || "");
        setTop2024(s.top2024?.toString() || "");
        setTop2025(s.top2025?.toString() || "");
        setTop2026(s.top2026?.toString() || "");
      }
      setLoading(false);
    });
  }, [id]);

  const handleLogin = () => {
    if (!login(password)) setLoginError(true);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="card p-6 space-y-4">
          <h2 className="font-display font-bold text-xl text-white text-center">Admin access</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            className="input-field"
          />
          {loginError && <p className="text-red-400 text-sm">Wrong password</p>}
          <button onClick={handleLogin} className="btn-primary w-full justify-center">Log in</button>
        </div>
      </div>
    );
  }

  if (loading) return <PageSkeleton />;
  if (!song) return <div className="text-center py-20 text-ink-400">Song not found</div>;

  const parseTopVal = (val: string): number | null => {
    const n = parseInt(val);
    return isNaN(n) || n < 1 || n > 4000 ? null : n;
  };
  const parsePriceVal = (val: string): number | null => {
    const s = val.replace("€", "").replace(",-", "").replace(",", ".").trim();
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  const handleSubmit = async () => {
    if (!artist.trim() || !title.trim()) return;
    setSaving(true);

    let coverPath = song.cover_path;
    if (coverFile) {
      const safeName = title.replace(/[^a-zA-Z0-9_-]/g, "_");
      const storagePath = `cover_${safeName}.jpg`;
      await supabase.storage.from("covers").upload(storagePath, coverFile, {
        contentType: coverFile.type,
        upsert: true,
      });
      coverPath = storagePath;
    }

    const rankings = await autofillRankingsFromAnchors({
      top2023: parseTopVal(top2023),
      top2024: parseTopVal(top2024),
      top2025: parseTopVal(top2025),
      top2026: parseTopVal(top2026),
    });

    await updateSong(id, {
      artist: artist.trim(),
      title: title.trim(),
      year: year ? parseInt(year) : null,
      genre: genre || null,
      format,
      country: country || null,
      original,
      top4000,
      tracklist: tracklist || null,
      description: description || null,
      price_raw: price || null,
      price_eur: parsePriceVal(price),
      top2023: rankings.top2023,
      top2024: rankings.top2024,
      top2025: rankings.top2025,
      top2026: rankings.top2026,
      cover_path: coverPath,
    });

    setSaving(false);
    setSuccess(true);
    setTimeout(() => router.push(`/music/${id}`), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.back()} className="text-ink-400 hover:text-ink-200 flex items-center gap-2 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-groove/10">
          <Edit className="w-6 h-6 text-groove" />
        </div>
        <h1 className="page-title">Edit record</h1>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="w-5 h-5" /> Changes saved! Redirecting…
        </div>
      )}

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Artist *</label>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Year</label>
            <input value={year} onChange={(e) => setYear(e.target.value)} className="input-field" type="number" />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Genre</label>
            <input value={genre} onChange={(e) => setGenre(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="input-field">
              {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Country</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Price (€)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} className="input-field" />
          </div>
          <div className="flex items-center gap-6 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={original === "Yes"} onChange={(e) => setOriginal(e.target.checked ? "Yes" : "Copy")} className="w-4 h-4 rounded bg-ink-800 border-ink-600 text-groove" />
              <span className="text-sm text-ink-300">Original pressing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={top4000} onChange={(e) => setTop4000(e.target.checked)} className="w-4 h-4 rounded bg-ink-800 border-ink-600 text-groove" />
              <span className="text-sm text-ink-300">In Top 4000</span>
            </label>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-ink-400 mb-3">Top 4000 positions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><label className="block text-xs text-ink-500 mb-1">2023</label><input value={top2023} onChange={(e) => setTop2023(e.target.value)} className="input-field" /></div>
            <div><label className="block text-xs text-ink-500 mb-1">2024</label><input value={top2024} onChange={(e) => setTop2024(e.target.value)} className="input-field" /></div>
            <div><label className="block text-xs text-ink-500 mb-1">2025</label><input value={top2025} onChange={(e) => setTop2025(e.target.value)} className="input-field" /></div>
            <div><label className="block text-xs text-ink-500 mb-1">2026</label><input value={top2026} onChange={(e) => setTop2026(e.target.value)} className="input-field" /></div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Tracklist</label>
          <textarea value={tracklist} onChange={(e) => setTracklist(e.target.value)} className="input-field min-h-[100px]" />
        </div>
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Notes / Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[80px]" />
        </div>

        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Replace cover image</label>
          <label className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-ink-700 hover:border-ink-500 cursor-pointer transition-colors">
            <Upload className="w-5 h-5 text-ink-500" />
            <span className="text-sm text-ink-400">{coverFile ? coverFile.name : "Click to upload a new cover"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => router.back()} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={!artist.trim() || !title.trim() || saving} className="btn-primary disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
