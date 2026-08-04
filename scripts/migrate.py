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
import unicodedata
from collections import Counter, defaultdict

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

    existing = sb.table("songs").select("artist", "title").execute()
    existing_songs = {(r["artist"].strip().lower(), r["title"].strip().lower()) for r in existing.data}
    new_records = []
    for record in records:
        key = (record["artist"].strip().lower(), record["title"].strip().lower())
        if key not in existing_songs:
            new_records.append(record)
    
    # Batch insert in chunks of 500
    BATCH = 500
    for i in range(0, len(new_records), BATCH):
        batch = new_records[i:i+BATCH]
        sb.table("songs").insert(batch).execute()
        print(f"  Inserted songs {i+1}–{i+len(batch)}")

    print(f"✅ Imported {len(new_records)} songs")
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

    existing = sb.table("top4000_lists").select("list_year", "position").eq("list_year", year).execute()
    existing_entries = {(r["list_year"], r["position"]) for r in existing.data}
    new_records = [r for r in records if (r["list_year"], r["position"]) not in existing_entries]
    print(f"Found {len(new_records)} new entries for {year}")
    BATCH = 500
    for i in range(0, len(new_records), BATCH):
        batch = new_records[i:i+BATCH]
        sb.table("top4000_lists").insert(batch).execute()

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

    # ── 5. Sync Top 4000 rankings into songs ─────────────────────

TOP4000_YEARS = [2023, 2024, 2025, 2026]


def normalize_text(value):
    """
    Normalise text for robust matching inside Top 4000 lists.

    Handles:
    - different capital letters
    - accents, e.g. Beyoncé vs Beyonce
    - punctuation differences
    - extra spaces
    - & versus and
    """
    if value is None:
        return ""

    text = str(value)

    # Remove accents, e.g. é -> e
    text = unicodedata.normalize("NFKD", text)
    text = "".join(
        char for char in text
        if not unicodedata.combining(char)
    )

    text = text.lower()

    # Normalise common textual differences
    text = text.replace("&", " and ")

    # Remove punctuation but keep letters, numbers and spaces
    text = re.sub(r"[^\w\s]", " ", text)

    # Collapse repeated spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def top4000_key(artist, title):
    """
    Create a comparable key from Top 4000 artist/title.
    Important: this key is based on Top 4000 entries,
    not on the collection song title.
    """
    return (
        normalize_text(artist),
        normalize_text(title),
    )


def fetch_all_rows(table_name, select_clause="*"):
    """
    Fetch all rows from a Supabase table using pagination.

    This avoids a common issue where Supabase only returns
    the first page of results. Top 4000 lists can easily exceed
    the default response size.
    """
    all_rows = []
    batch_size = 1000
    start = 0

    while True:
        end = start + batch_size - 1

        response = (
            sb.table(table_name)
            .select(select_clause)
            .range(start, end)
            .execute()
        )

        rows = response.data or []
        all_rows.extend(rows)

        if len(rows) < batch_size:
            break

        start += batch_size

    return all_rows


def sync_top4000():
    """
    Fill missing topYYYY values in songs by using existing rankings
    as anchors.

    Example:
    - songs.top2023 = 600
    - Look up Top 4000 2023 position 600
    - Suppose that is Eagles - Hotel California
    - Find Eagles - Hotel California in all other Top 4000 years
    - Fill only empty topYYYY fields

    This does NOT match on songs.title, because the record title
    may contain edition/version text that differs from the actual
    Top 4000 song title.
    """

    print("\n── Sync Top 4000 rankings ──")

    rankings = fetch_all_rows(
        "top4000_lists",
        "list_year,position,artist,title"
    )

    songs = fetch_all_rows(
        "songs",
        "id,artist,title,top4000,top2023,top2024,top2025,top2026"
    )

    print(f"Loaded {len(rankings)} Top 4000 entries")
    print(f"Loaded {len(songs)} songs")

    # 1. Lookup Top 4000 entry by exact year + position
    # Example: (2023, 600) -> Queen - Bohemian Rhapsody
    ranking_by_year_position = {}

    # 2. Lookup all rankings for the same canonical Top 4000 song
    # Example: ("queen", "bohemian rhapsody") -> {2023: 10, 2024: 9}
    rankings_by_canonical_song = defaultdict(dict)

    for r in rankings:
        list_year = safe_int(r.get("list_year"))
        position = safe_int(r.get("position"))
        artist = clean(r.get("artist"))
        title = clean(r.get("title"))

        if list_year is None or position is None or not artist or not title:
            continue

        canonical_key = top4000_key(artist, title)

        ranking_by_year_position[(list_year, position)] = {
            "list_year": list_year,
            "position": position,
            "artist": artist,
            "title": title,
            "canonical_key": canonical_key,
        }

        rankings_by_canonical_song[canonical_key][list_year] = position

    updated_count = 0
    skipped_no_anchor = 0
    skipped_conflict = 0
    missing_anchor_count = 0

    for song in songs:
        song_id = song.get("id")
        display_artist = song.get("artist") or ""
        display_title = song.get("title") or ""

        # Find existing rankings in the song record.
        # These are the anchors.
        anchors = []

        for year in TOP4000_YEARS:
            column = f"top{year}"
            position = safe_int(song.get(column))

            if position is None:
                continue

            top4000_entry = ranking_by_year_position.get((year, position))

            if top4000_entry is None:
                missing_anchor_count += 1
                print(
                    f"  WARNING: Existing ranking could not be found in Top4000 list: "
                    f"{display_artist} - {display_title}, {year} #{position}"
                )
                continue

            anchors.append(top4000_entry)

        # If there is no existing ranking, we cannot safely infer the real
        # Top 4000 song, because the collection title may differ.
        if not anchors:
            skipped_no_anchor += 1
            continue

        # If multiple existing rankings are present, they should all point
        # to the same canonical Top 4000 song.
        canonical_keys = [a["canonical_key"] for a in anchors]
        key_counts = Counter(canonical_keys)

        if len(key_counts) > 1:
            skipped_conflict += 1

            readable_anchors = [
                f'{a["list_year"]} #{a["position"]}: {a["artist"]} - {a["title"]}'
                for a in anchors
            ]

            print(
                f"  WARNING: Conflicting Top4000 anchors for "
                f"{display_artist} - {display_title}. Skipping."
            )
            for anchor_text in readable_anchors:
                print(f"    - {anchor_text}")

            continue

        canonical_key = canonical_keys[0]

        # These are all known rankings for the actual Top 4000 song.
        known_years = rankings_by_canonical_song.get(canonical_key, {})

        updates = {}

        for year in TOP4000_YEARS:
            column = f"top{year}"

            # Only fill empty database fields.
            # This preserves manual corrections.
            if song.get(column) is None and year in known_years:
                updates[column] = known_years[year]

        # If we found a Top4000 anchor, the song is definitely in Top4000.
        if song.get("top4000") is not True:
            updates["top4000"] = True

        if updates:
            (
                sb.table("songs")
                .update(updates)
                .eq("id", song_id)
                .execute()
            )

            updated_count += 1

            print(
                f"  Updated {display_artist} - {display_title}: {updates}"
            )

    print(f"✅ Sync complete")
    print(f"  Updated songs: {updated_count}")
    print(f"  Skipped, no existing ranking anchor: {skipped_no_anchor}")
    print(f"  Skipped, conflicting anchors: {skipped_conflict}")
    print(f"  Existing rankings not found in Top4000 lists: {missing_anchor_count}")


# ── Main ─────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Music Collection Migration")
    print("=" * 60)

    print("\n── Step 1: Import songs ──")
    top1000_rows = import_songs()

    print("\n── Step 3: Import Top 4000 lists ──")
    import_top4000_list(2023, os.path.join(DATA_DIR, "Top 4000 2023.xlsx"))
    import_top4000_list(2024, os.path.join(DATA_DIR, "Top 4000 2024.xlsx"))
    import_top4000_list(2025, os.path.join(DATA_DIR, "Top 4000 2025.xlsx"))
    sync_top4000()

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
