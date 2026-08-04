"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusCircle, Upload, CheckCircle2 } from "lucide-react";
import { createSong } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/lib/admin-context";
import { FORMAT_OPTIONS } from "@/lib/types";

// 1. Extract the main logic into a child component
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

function AddMusicForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, login } = useAdmin();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const [artist, setArtist] = useState(searchParams.get("artist") || "");
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

  const handleLogin = () => {
    if (!login(password)) setLoginError(true);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-sm mx-auto mt-20">
        <div className="card p-6 space-y-4">
          <h2 className="font-display font-bold text-xl text-white text-center">Admin access</h2>
          <p className="text-sm text-ink-400 text-center">Enter the admin password to add or edit records</p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            className="input-field"
          />
          {loginError && <p className="text-red-400 text-sm">Wrong password</p>}
          <button onClick={handleLogin} className="btn-primary w-full justify-center">
            Log in
          </button>
        </div>
      </div>
    );
  }

  const parseTopVal = (val: string): number | null => {
    const n = parseInt(val);
    if (isNaN(n) || n < 1 || n > 4000) return null;
    return n;
  };

  const parsePriceVal = (val: string): number | null => {
    const s = val.replace("€", "").replace(",-", "").replace(",", ".").trim();
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  const handleSubmit = async () => {
    if (!artist.trim() || !title.trim()) return;
    setSaving(true);

    let coverPath: string | null = null;

    // Upload cover if provided
    if (coverFile) {
      const safeName = title.replace(/[^a-zA-Z0-9_-]/g, "_");
      const storagePath = `cover_${safeName}.jpg`;
      await supabase.storage.from("covers").upload(storagePath, coverFile, {
        contentType: coverFile.type,
        upsert: true,
      });
      coverPath = storagePath;
    }

    const rankings = await autofillRankings(artist.trim(), title.trim(), {
      top2023: parseTopVal(top2023),
      top2024: parseTopVal(top2024),
      top2025: parseTopVal(top2025),
      top2026: parseTopVal(top2026),
    });
    await createSong({
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
    setTimeout(() => {
      setSuccess(false);
      // Reset form
      setTitle("");
      setYear("");
      setGenre("");
      setTracklist("");
      setDescription("");
      setPrice("");
      setTop2023("");
      setTop2024("");
      setTop2025("");
      setTop2026("");
      setCoverFile(null);
    }, 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-groove/10">
          <PlusCircle className="w-6 h-6 text-groove" />
        </div>
        <h1 className="page-title">Add new record</h1>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="w-5 h-5" /> Record added successfully!
        </div>
      )}

      <div className="card p-6 space-y-6">
        {/* Main fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Artist *</label>
            <input value={artist} onChange={(e) => setArtist(e.target.value)} className="input-field" placeholder="e.g. Queen" />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="e.g. Bohemian Rhapsody" />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Year</label>
            <input value={year} onChange={(e) => setYear(e.target.value)} className="input-field" type="number" min={1900} max={2100} placeholder="1975" />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Genre</label>
            <input value={genre} onChange={(e) => setGenre(e.target.value)} className="input-field" placeholder="e.g. Rock" />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="input-field">
              {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Country</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className="input-field" placeholder="e.g. Nederland" />
          </div>
          <div>
            <label className="block text-sm text-ink-400 mb-1.5">Price (€)</label>
            <input value={price} onChange={(e) => setPrice(e.target.value)} className="input-field" placeholder="e.g. 5 or 2,50" />
          </div>
          <div className="flex items-center gap-6 pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={original === "Yes"} onChange={(e) => setOriginal(e.target.checked ? "Yes" : "Copy")} className="w-4 h-4 rounded bg-ink-800 border-ink-600 text-groove focus:ring-groove/30" />
              <span className="text-sm text-ink-300">Original pressing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={top4000} onChange={(e) => setTop4000(e.target.checked)} className="w-4 h-4 rounded bg-ink-800 border-ink-600 text-groove focus:ring-groove/30" />
              <span className="text-sm text-ink-300">In Top 4000</span>
            </label>
          </div>
        </div>

        {/* Top 4000 rankings */}
        <div>
          <h3 className="text-sm font-medium text-ink-400 mb-3">Top 4000 positions (1–4000 or leave empty)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-ink-500 mb-1">2023</label>
              <input value={top2023} onChange={(e) => setTop2023(e.target.value)} className="input-field" placeholder="—" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">2024</label>
              <input value={top2024} onChange={(e) => setTop2024(e.target.value)} className="input-field" placeholder="—" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">2025</label>
              <input value={top2025} onChange={(e) => setTop2025(e.target.value)} className="input-field" placeholder="—" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">2026</label>
              <input value={top2026} onChange={(e) => setTop2026(e.target.value)} className="input-field" placeholder="—" />
            </div>
          </div>
        </div>

        {/* Tracklist + Description */}
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Tracklist</label>
          <textarea value={tracklist} onChange={(e) => setTracklist(e.target.value)} className="input-field min-h-[100px]" placeholder="A: Song Title (3:46)&#10;B: Song Title (2:30)" />
        </div>
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Notes / Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[80px]" placeholder="Any notes about this record…" />
        </div>

        {/* Cover upload */}
        <div>
          <label className="block text-sm text-ink-400 mb-1.5">Cover image</label>
          <label className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-ink-700 hover:border-ink-500 cursor-pointer transition-colors">
            <Upload className="w-5 h-5 text-ink-500" />
            <span className="text-sm text-ink-400">
              {coverFile ? coverFile.name : "Click to upload a cover photo"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => router.back()} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!artist.trim() || !title.trim() || saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Add record"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. Export the main page, wrapping the form component in a Suspense boundary
export default function AddMusicPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12 text-ink-400">
        Loading form...
      </div>
    }>
      <AddMusicForm />
    </Suspense>
  );
}