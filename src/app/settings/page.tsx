"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Download, LogIn, LogOut, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/lib/admin-context";

export default function SettingsPage() {
  const { isAdmin, login, logout } = useAdmin();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleLogin = () => {
    if (!login(password)) {
      setLoginError(true);
    } else {
      setPassword("");
      setLoginError(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    const { data } = await supabase.from("songs").select("*").order("artist");
    if (!data) { setExporting(false); return; }

    const headers = [
      "artist", "title", "year", "genre", "format", "country", "original",
      "tracklist", "description", "price_raw", "price_eur", "top4000",
      "top2023", "top2024", "top2025", "top2026",
    ];

    const csvRows = [headers.join(",")];
    for (const row of data) {
      csvRows.push(
        headers.map((h) => {
          const val = (row as Record<string, unknown>)[h];
          if (val == null) return "";
          const str = String(val);
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(",")
      );
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `music-collection-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-ink-800">
          <SettingsIcon className="w-6 h-6 text-ink-400" />
        </div>
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Admin mode */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-ink-500" />
          <h2 className="font-display font-bold text-white">Admin mode</h2>
        </div>
        <p className="text-sm text-ink-400">
          Admin mode lets you add, edit, and delete records. It uses a simple password — not full authentication.
        </p>
        {isAdmin ? (
          <div className="flex items-center gap-3">
            <span className="badge bg-emerald-500/10 text-emerald-400">Active</span>
            <button onClick={logout} className="btn-secondary text-sm">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter password"
              className="input-field max-w-xs"
            />
            <button onClick={handleLogin} className="btn-primary text-sm">
              <LogIn className="w-4 h-4" /> Log in
            </button>
          </div>
        )}
        {loginError && <p className="text-red-400 text-sm">Wrong password</p>}
      </div>

      {/* Export */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-ink-500" />
          <h2 className="font-display font-bold text-white">Export data</h2>
        </div>
        <p className="text-sm text-ink-400">
          Download your entire collection as a CSV file for backup or analysis.
        </p>
        <button onClick={handleExportCSV} disabled={exporting} className="btn-secondary text-sm">
          <Download className="w-4 h-4" />
          {exporting ? "Exporting…" : "Download CSV"}
        </button>
      </div>

      {/* About */}
      <div className="card p-5 space-y-2">
        <h2 className="font-display font-bold text-white">About</h2>
        <p className="text-sm text-ink-400">
          Music Collection v1.0 — A personal vinyl & music tracker.
          Built with Next.js, Supabase, and Tailwind CSS.
        </p>
      </div>
    </div>
  );
}
