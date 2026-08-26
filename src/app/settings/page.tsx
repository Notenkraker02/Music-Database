"use client";

import { useRef, useState } from "react";
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  LogIn,
  LogOut,
  Shield,
  Database,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/lib/admin-context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  createBackup,
  downloadBackup,
  restoreBackup,
  type RestoreResult,
} from "@/lib/backup";

export default function SettingsPage() {
  const { isAdmin, login, logout } = useAdmin();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  const [exporting, setExporting] = useState(false);

  // Full backup
  const [includeCovers, setIncludeCovers] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState("");

  // Restore
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState("");
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoreCovers, setRestoreCovers] = useState(true);

  const handleLogin = () => {
    if (!login(password)) {
      setLoginError(true);
    } else {
      setPassword("");
      setLoginError(false);
    }
  };

  // ── CSV export (unchanged) ───────────────────────────────
  const handleExportCSV = async () => {
    setExporting(true);
    const { data } = await supabase.from("songs").select("*").order("artist");
    if (!data) {
      setExporting(false);
      return;
    }

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

  // ── Full JSON backup ─────────────────────────────────────
  const handleFullBackup = async () => {
    setBackingUp(true);
    setBackupStatus("Starting…");
    try {
      const backup = await createBackup(includeCovers, (m) => setBackupStatus(m));
      downloadBackup(backup);
      const counts = Object.entries(backup.tables)
        .map(([t, rows]) => `${rows.length} ${t}`)
        .join(", ");
      const coverNote = backup.covers
        ? ` and ${Object.keys(backup.covers).length} covers`
        : "";
      setBackupStatus(`Done — backed up ${counts}${coverNote}.`);
    } catch (e) {
      setBackupStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setBackingUp(false);
    }
  };

  // ── Restore ──────────────────────────────────────────────
  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingFile(reader.result as string);
      setConfirmOpen(true);
    };
    reader.readAsText(file);
    // Allow re-selecting the same file later.
    e.target.value = "";
  };

  const runRestore = async () => {
    setConfirmOpen(false);
    if (!pendingFile) return;
    setRestoring(true);
    setRestoreResult(null);
    setRestoreStatus("Starting…");
    try {
      const result = await restoreBackup(pendingFile, restoreCovers, (m) =>
        setRestoreStatus(m)
      );
      setRestoreResult(result);
      setRestoreStatus("Restore complete.");
    } catch (e) {
      setRestoreStatus(`Failed: ${(e as Error).message}`);
    } finally {
      setRestoring(false);
      setPendingFile(null);
    }
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

      {/* Full backup */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-ink-500" />
          <h2 className="font-display font-bold text-white">Full backup &amp; restore</h2>
        </div>
        <p className="text-sm text-ink-400">
          A complete snapshot of every table (records, Top 1000, Top 4000 lists){" "}
          in one JSON file. If you ever lose the site, create a fresh Supabase
          project from <code className="text-ink-300">supabase/schema.sql</code> in
          your GitHub repo, then upload this file below to bring everything back.
        </p>

        <label className="flex items-center gap-2 text-sm text-ink-300">
          <input
            type="checkbox"
            checked={includeCovers}
            onChange={(e) => setIncludeCovers(e.target.checked)}
            className="accent-groove"
          />
          Include cover images (larger file, but a true full restore)
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleFullBackup} disabled={backingUp} className="btn-primary text-sm">
            <Download className="w-4 h-4" />
            {backingUp ? "Backing up…" : "Download full backup (JSON)"}
          </button>
          <button onClick={handleExportCSV} disabled={exporting} className="btn-secondary text-sm">
            <Download className="w-4 h-4" />
            {exporting ? "Exporting…" : "Records only (CSV)"}
          </button>
        </div>
        {backupStatus && <p className="text-xs text-ink-500">{backupStatus}</p>}

        <div className="border-t border-ink-800 pt-4 space-y-3">
          <p className="text-sm text-ink-400">
            Restore from a backup file. Records are matched by ID and updated in
            place, so this is safe to run on an empty or existing database.
          </p>
          {isAdmin ? (
            <>
              <label className="flex items-center gap-2 text-sm text-ink-300">
                <input
                  type="checkbox"
                  checked={restoreCovers}
                  onChange={(e) => setRestoreCovers(e.target.checked)}
                  className="accent-groove"
                />
                Also restore cover images (if the file contains them)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChosen}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={restoring}
                className="btn-secondary text-sm"
              >
                <Upload className="w-4 h-4" />
                {restoring ? "Restoring…" : "Upload backup to restore"}
              </button>
              {restoreStatus && <p className="text-xs text-ink-500">{restoreStatus}</p>}
              {restoreResult && (
                <div className="text-xs text-ink-400 space-y-1">
                  {Object.entries(restoreResult.inserted).map(([t, n]) => (
                    <div key={t}>
                      {t}: {n} records restored
                    </div>
                  ))}
                  {restoreResult.coversUploaded > 0 && (
                    <div>covers: {restoreResult.coversUploaded} restored</div>
                  )}
                  {restoreResult.warnings.length > 0 && (
                    <div className="text-amber-400 mt-1">
                      {restoreResult.warnings.length} warning(s):
                      <ul className="list-disc ml-4">
                        {restoreResult.warnings.slice(0, 5).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-500">
              Log in as admin above to restore from a backup.
            </p>
          )}
        </div>
      </div>

      {/* About */}
      <div className="card p-5 space-y-2">
        <h2 className="font-display font-bold text-white">About</h2>
        <p className="text-sm text-ink-400">
          Music Collection v1.0 — A personal vinyl &amp; music tracker.
          Built with Next.js, Supabase, and Tailwind CSS.
        </p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Restore from backup?"
        message="This will write the backup's records into your database, overwriting any records with the same ID. Existing records not in the backup are left untouched."
        confirmLabel="Restore"
        onConfirm={runRestore}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingFile(null);
        }}
      />
    </div>
  );
}
