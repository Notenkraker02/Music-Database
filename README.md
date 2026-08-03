# Music Collection

A personal vinyl & music collection tracker built with **Next.js 14**, **Supabase**, and **Tailwind CSS**. Rebuilt from a Streamlit prototype — tracks ~2,000 records, ranks them against the NPO Radio 2 Top 4000 lists, and includes a personal Top 1000.

## Features

- **Dashboard** — stats overview, decade chart, random shuffle, recently added
- **All Music** — search, filter by genre/format/decade/Top 4000, grid & table views, sort, pagination
- **Song Detail** — cover, metadata, tracklist, ranking history, related records
- **Artists** — alphabet jump, search, per-artist stats and discography
- **My Top 1000** — personal ranking with search
- **My Top 4000** — cross-reference your collection against each year's radio list with coverage bar
- **Top 4000 Lists** — browse the full radio Top 4000 by year
- **Insights** — decade breakdown, top artists, most valuable, data quality overview
- **Add / Edit / Delete** — admin-gated CRUD with cover upload
- **Settings** — admin login, CSV export

---

## Prerequisites

- **Node.js 18+** and npm
- A **Supabase** account (free tier works)
- **Python 3.8+** (for the one-time data migration)
- Your data files (see below)

---

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon key** (Settings → API).
3. Also note the **service role key** (for migration only — never ship this to the browser).

### 2. Run the database schema

1. Open the **SQL Editor** in your Supabase dashboard.
2. Paste the contents of `supabase/schema.sql` and run it.
3. This creates the `songs`, `top1000`, `top4000_lists` tables, a `covers` storage bucket, indexes, and RLS policies.

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
NEXT_PUBLIC_ADMIN_PASSWORD=your-secret-password
```

### 4. Migrate your data

Place your Excel files in the `scripts/` folder with the exact names the code expects:

```
scripts/
  Persistent Music Database.xlsx
  Top 4000 2023.xlsx
  Top 4000 2024.xlsx
  Top 4000 2025.xlsx
```

If your filenames differ (e.g. spaces replaced by underscores, version numbers appended), rename them to match or edit the filenames in `scripts/migrate.py`.

Create a `.env` file in the project root with `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`, then run:

```bash
pip install pandas openpyxl supabase python-dotenv
python scripts/migrate.py
```

You should see output like:

```
══════════════════════════════════════════════════
Music Collection Migration
══════════════════════════════════════════════════
── Step 1: Import songs ──
  Inserted songs 1–500
  Inserted songs 501–1000
  ...
✅ Imported 2018 songs

── Step 2: Import Top 1000 ──
  Inserted top1000 1–175
✅ Imported 175 Top 1000 entries

── Step 3: Import Top 4000 lists ──
✅ Imported ~4000 entries for Top 4000 2023
✅ Imported ~4000 entries for Top 4000 2024
✅ Imported ~4000 entries for Top 4000 2025

── Step 4: Upload covers ──
  No covers/ folder found — skipping cover upload
```

**Optional — covers:** If you have a `covers/` folder with JPEG files, place it inside `scripts/`. The migration script will upload them to Supabase Storage and link them to matching songs.

You can also upload the placeholder cover manually: go to Supabase Storage → covers bucket → upload `empty_cover.jpg`.

### 5. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

1. Push your code to a GitHub repository (do NOT commit `.env.local`).
2. Go to [vercel.com](https://vercel.com), import the repo.
3. Set environment variables in the Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_PASSWORD`
4. Deploy. Vercel auto-detects Next.js.

Note: `SUPABASE_SERVICE_KEY` is only needed for the migration script. Do NOT add it to Vercel.

---

## Project Structure

```
music-collection/
├── supabase/
│   └── schema.sql            # Database schema (run in Supabase SQL Editor)
├── scripts/
│   └── migrate.py            # One-time Python migration from Excel to Supabase
├── src/
│   ├── app/
│   │   ├── globals.css       # Tailwind + custom styles + fonts
│   │   ├── layout.tsx        # Root layout (sidebar, mobile nav, admin context)
│   │   ├── page.tsx          # Dashboard
│   │   ├── music/
│   │   │   ├── page.tsx      # All Music (search, filter, grid/table)
│   │   │   └── [id]/page.tsx # Song detail
│   │   ├── artists/
│   │   │   ├── page.tsx      # All Artists (alphabet jump)
│   │   │   └── [name]/page.tsx # Artist detail
│   │   ├── top-1000/page.tsx # Personal Top 1000
│   │   ├── my-top-4000/page.tsx # Cross-reference owned vs radio list
│   │   ├── top-4000/page.tsx # Browse full radio Top 4000
│   │   ├── insights/page.tsx # Collection analytics
│   │   ├── settings/page.tsx # Admin, export, about
│   │   └── admin/
│   │       ├── add/page.tsx  # Add new record
│   │       └── edit/[id]/page.tsx # Edit record
│   ├── components/
│   │   ├── sidebar.tsx       # Desktop sidebar navigation
│   │   ├── mobile-nav.tsx    # Mobile bottom tab bar
│   │   ├── stat-card.tsx     # Dashboard stat display
│   │   ├── cover-image.tsx   # Lazy-loaded cover with fallback
│   │   ├── music-card.tsx    # Grid card for song
│   │   ├── search-bar.tsx    # Search input
│   │   ├── filter-panel.tsx  # Collapsible genre/format/decade/top4000 filters
│   │   ├── pagination.tsx    # Page navigation
│   │   ├── loading.tsx       # Skeleton loaders
│   │   ├── empty-state.tsx   # Empty state placeholder
│   │   └── confirm-dialog.tsx # Confirmation modal
│   └── lib/
│       ├── supabase.ts       # Supabase client + getCoverUrl
│       ├── types.ts          # TypeScript interfaces
│       ├── utils.ts          # Price formatting, duration parsing, helpers
│       ├── queries.ts        # All Supabase data fetching functions
│       └── admin-context.tsx # Simple password-based admin mode
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
└── README.md
```

---

## Validation Checklist

After migration, verify in Supabase:

- [ ] `songs` table has ~2,018 rows
- [ ] No sentinel rows (AAA Artists, Top 1000, JJJ, etc.)
- [ ] `top1000` table has ~175 entries, positions are unique integers
- [ ] `top4000_lists` table has ~12,000 entries (3 years × ~4,000)
- [ ] Year=1900 rows were converted to NULL
- [ ] Price values parsed correctly (e.g. "6,-" → 6.00, "2,75" → 2.75)
- [ ] `covers` Storage bucket exists and is public

In the app:

- [ ] Dashboard loads with correct stats
- [ ] All Music shows records, search works
- [ ] Artist alphabet jump works
- [ ] Song detail page shows tracklist and ranking history
- [ ] My Top 4000 shows coverage bar and owned indicators
- [ ] Admin login/logout works from Settings page
- [ ] Add/Edit forms save correctly
- [ ] CSV export downloads

---

## Data Notes

- **Formats:** 99% of the collection is "Vinyl 7 Inch 45 RPM" (7-inch singles). The A:/B: tracklist format reflects this.
- **Genre:** Only ~3% of records have a genre assigned. The field is free-text and inconsistent.
- **Covers:** Only 6 records have actual cover images. The rest use a placeholder.
- **Prices:** Stored as Dutch-formatted strings ("6,-", "2,75") in `price_raw` and parsed to EUR floats in `price_eur`.
- **Top 4000:** Refers to NPO Radio 2's annual listener poll. The `top2023`/`top2024` columns on songs indicate their position in that year's list.
- **Top 1000:** A personal ranking stored in the original Excel as special "Top 1000" rows, extracted into a separate table.
- **Year 1900:** Used as a placeholder for "unknown year" in the original data — converted to NULL during migration.
- **Duplicate titles:** 14 Artist+Title pairs appear twice (different pressings). This is intentional.

---

## Tech Stack

- **Next.js 14** (App Router, React Server Components where applicable)
- **TypeScript**
- **Tailwind CSS** (custom vinyl-inspired dark theme)
- **Supabase** (PostgreSQL + Storage + Row Level Security)
- **Recharts** (available for charts if needed)
- **Lucide React** (icons)
