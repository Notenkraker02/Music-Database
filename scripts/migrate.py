#!/usr/bin/env python3
"""
migrate.py — Import Excel data into Supabase.

Usage:
  pip install pandas openpyxl supabase python-dotenv
  cp .env.example .env   # fill in SUPABASE_URL + SUPABASE_SERVICE_KEY
  python scripts/migrate.py

Reads:
  - "Persistent Music Database.xlsx"  (main collection)
  - "Top 4000 2023.xlsx"
  - "Top 4000 2024.xlsx"
  - "Top 4000 2025.xlsx"

Writes to Supabase tables: songs, top1000, top4000_lists
"""

import os
import re
import sys
import math
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]  # service role key for migration

sb = create_client(SUPABASE_URL, SUPABASE_KEY)

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

# ── helpers ──────────────────────────────────────────────────

def clean(val):
    """Return None for NaN / empty, else stripped string."""
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    s = str(val).strip()
    if s in ("", ".", "nan", "NaN"):
        return None
    return s


def parse_price(raw):
    """Parse Dutch price strings like '6,-', '2,75', '17,50' → float."""
    if raw is None:
        return None
    s = str(raw).strip().replace("€", "")
    s = re.sub(r"[\s]*,-?$", "", s)
    s = s.replace(",", ".")
    m = re.search(r"\d+(\.\d+)?", s)
    return float(m.group(0)) if m else None


def safe_int(val):
    """Coerce to int or None."""
    if val is None:
        return None
    if isinstance(val, float):
        if math.isnan(val):
            return None
        return int(val)
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def safe_year(val):
    """Year to int, treating 1900 as unknown → None."""
    y = safe_int(val)
    if y is not None and y == 1900:
        return None
    return y


# ── 1. Import songs ─────────────────────────────────────────

def import_songs():
    filepath = os.path.join(DATA_DIR, "Persistent Music Database.xlsx")
    if not os.path.exists(filepath):
        print(f"ERROR: {filepath} not found. Place it in scripts/ folder.")
        sys.exit(1)

    df = pd.read_excel(filepath)
    print(f"Loaded {len(df)} rows from Excel")

    # Filter out sentinel rows
    sentinel = (
        df["Artist"].str.match(r"^(AAA|BBB|CCC|XXX|JJJ)", na=False) |
        df["Artist"].str.contains(r" Artists$", na=False) |
        df["Artist"].str.contains("Top 1000", na=False)
    )

    # Extract Top 1000 before filtering
    top1000_rows = df[df["Artist"].str.contains("Top 1000", na=False)].copy()

    real = df[~sentinel].copy()
    print(f"After removing sentinels: {len(real)} real songs, {len(top1000_rows)} Top 1000 entries")

    # Clean Artist / Title
    real["Artist"] = real["Artist"].apply(lambda x: re.sub(r"\s+", " ", str(x)).strip() if pd.notna(x) else "")
    real["Title"]  = real["Title"].apply(lambda x: re.sub(r"\s+", " ", str(x)).strip() if pd.notna(x) else "")

    records = []
    for _, row in real.iterrows():
        records.append({
            "artist":     clean(row.get("Artist")) or "",
            "title":      clean(row.get("Title")) or "",
            "year":       safe_year(row.get("Year")),
            "genre":      clean(row.get("Genre")),
            "format":     clean(row.get("Format")) or "Vinyl 7 Inch 45 RPM",
            "country":    clean(row.get("Country")),
            "original":   clean(row.get("Original")) or "Yes",
            "tracklist":  clean(row.get("Tracklist")),
            "description": clean(row.get("Description")),
            "price_raw":  clean(row.get("Price")),
            "price_eur":  parse_price(row.get("Price")),
            "top4000":    str(row.get("TOP4000", "")).strip().lower() == "yes",
            "top2023":    safe_int(row.get("TOP2023")),
            "top2024":    safe_int(row.get("TOP2024")),
            "top2025":    safe_int(row.get("TOP2025")),
            "top2026":    safe_int(row.get("TOP2026")),
            "cover_path": None,  # covers uploaded separately
        })

    # Batch insert in chunks of 500
    BATCH = 500
    for i in range(0, len(records), BATCH):
        batch = records[i:i+BATCH]
        res = sb.table("songs").insert(batch).execute()
        print(f"  Inserted songs {i+1}–{i+len(batch)}")

    print(f"✅ Imported {len(records)} songs")
    return top1000_rows


# ── 2. Import Top 1000 ──────────────────────────────────────

def import_top1000(top1000_rows):
    records = []
    for _, row in top1000_rows.iterrows():
        position = safe_int(row.get("Year"))  # position stored in Year column
        artist_name = clean(row.get("Title"))  # real artist stored in Title
        tracklist = clean(row.get("Tracklist")) or ""

        # Parse "Song Title YYYY" from Tracklist
        m = re.match(r"(.+?)\s+(\d{4})$", tracklist)
        if m:
            song_title = m.group(1).strip()
            song_year = int(m.group(2))
        else:
            song_title = tracklist
            song_year = None

        if position and artist_name:
            records.append({
                "position": position,
                "artist":   artist_name,
                "title":    song_title,
                "year":     song_year,
            })

    # Deduplicate by position (keep first)
    seen = set()
    deduped = []
    for r in records:
        if r["position"] not in seen:
            seen.add(r["position"])
            deduped.append(r)

    BATCH = 500
    for i in range(0, len(deduped), BATCH):
        batch = deduped[i:i+BATCH]
        sb.table("top1000").insert(batch).execute()
        print(f"  Inserted top1000 {i+1}–{i+len(batch)}")

    print(f"✅ Imported {len(deduped)} Top 1000 entries")


# ── 3. Import Top 4000 lists ────────────────────────────────

def import_top4000_list(year: int, filepath: str):
    if not os.path.exists(filepath):
        print(f"  SKIP: {filepath} not found")
        return

    df = pd.read_excel(filepath)
    df.columns = [c.strip().capitalize() for c in df.columns]

    # Handle 2025 format (Notering column)
    if "Notering" in df.columns:
        df = df.rename(columns={"Notering": "Nr"})
        df["Jaar"] = None
    # else 2023/2024 format already has Nr, Artiest, Titel, Jaar

    # Filter to numeric Nr rows
    df["Nr"] = pd.to_numeric(df.get("Nr"), errors="coerce")
    df = df[df["Nr"].notna()].copy()
    df["Nr"] = df["Nr"].astype(int)

    if "Jaar" in df.columns:
        df["Jaar"] = pd.to_numeric(
            df["Jaar"].astype(str).str.replace(",", ""),
            errors="coerce"
        )

    records = []
    for _, row in df.iterrows():
        artist = clean(row.get("Artiest"))
        title  = clean(row.get("Titel"))
        if not artist or not title:
            continue
        records.append({
            "list_year": year,
            "position":  int(row["Nr"]),
            "artist":    artist,
            "title":     title,
            "song_year": safe_int(row.get("Jaar")),
        })

    BATCH = 500
    for i in range(0, len(records), BATCH):
        batch = records[i:i+BATCH]
        sb.table("top4000_lists").insert(batch).execute()
        print(f"  Inserted top4000 {year} rows {i+1}–{i+len(batch)}")

    print(f"✅ Imported {len(records)} entries for Top 4000 {year}")


# ── 4. Upload covers ────────────────────────────────────────

def upload_covers():
    covers_dir = os.path.join(DATA_DIR, "covers")
    if not os.path.isdir(covers_dir):
        print("  No covers/ folder found — skipping cover upload")
        return

    # Get a list of already uploaded files in the bucket to prevent duplicate errors
    try:
        existing_files = [f["name"] for f in sb.storage.from_("covers").list("covers")]
    except Exception:
        existing_files = []

    for fname in os.listdir(covers_dir):
        if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
            
        local_path = os.path.join(covers_dir, fname)
        storage_path = f"covers/{fname}"

        try:
            # Only upload if it doesn't already exist in the bucket
            if fname not in existing_files:
                with open(local_path, "rb") as f:
                    sb.storage.from_("covers").upload(
                        storage_path, f,
                        file_options={"content-type": "image/jpeg"}
                    )
                print(f"  Uploaded {fname}")
            else:
                print(f"  Skipped (already exists): {fname}")

            clean_name = fname.replace("cover_", "").replace(".jpg", "").replace("_", "%")
            sb.table("songs").update({"cover_path": storage_path}).ilike("title", clean_name).execute()
        except Exception as e:
            print(f"  ❌ Failed to process {fname}: {e}")

    placeholder = os.path.join(DATA_DIR, "empty cover.jpg")
    if os.path.exists(placeholder):
        try:
            if "empty_cover.jpg" not in existing_files:
                with open(placeholder, "rb") as f:
                    sb.storage.from_("covers").upload(
                        "empty_cover.jpg", f,
                        file_options={"content-type": "image/jpeg"}
                    )
                print("  Uploaded placeholder cover")
        except Exception as e:
            print(f"  ❌ Failed to upload placeholder: {e}")

    print("✅ Cover upload complete")


# ── Main ─────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Music Collection Migration")
    print("=" * 60)

    print("\n── Step 1: Import songs ──")
    top1000_rows = import_songs()

    print("\n── Step 2: Import Top 1000 ──")
    import_top1000(top1000_rows)

    print("\n── Step 3: Import Top 4000 lists ──")
    import_top4000_list(2023, os.path.join(DATA_DIR, "Top 4000 2023.xlsx"))
    import_top4000_list(2024, os.path.join(DATA_DIR, "Top 4000 2024.xlsx"))
    import_top4000_list(2025, os.path.join(DATA_DIR, "Top 4000 2025.xlsx"))

    print("\n── Step 4: Upload covers ──")
    upload_covers()

    print("\n" + "=" * 60)
    print("Migration complete!")
    print("=" * 60)

    # Validation
    print("\n── Validation ──")
    songs = sb.table("songs").select("id", count="exact").execute()
    print(f"  Songs in database: {songs.count}")
    top1000 = sb.table("top1000").select("id", count="exact").execute()
    print(f"  Top 1000 entries:  {top1000.count}")
    top4000 = sb.table("top4000_lists").select("id", count="exact").execute()
    print(f"  Top 4000 entries:  {top4000.count}")


if __name__ == "__main__":
    main()
