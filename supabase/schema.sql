-- ============================================================
-- Music Collection — Supabase Schema
-- Run this in Supabase SQL Editor (or via CLI migration)
-- ============================================================

-- Enable extensions
create extension if not exists "pg_trgm";   -- fuzzy text search
create extension if not exists "uuid-ossp"; -- uuid generation

-- ============================================================
-- 1. SONGS — the main collection table
-- ============================================================
create table songs (
  id            uuid primary key default uuid_generate_v4(),
  artist        text not null default '',
  title         text not null default '',
  year          smallint,
  genre         text,
  format        text not null default 'Vinyl 7 Inch 45 RPM',
  country       text,
  original      text not null default 'Yes',
  tracklist     text,
  description   text,
  price_raw     text,            -- original string e.g. "6,-" or "2,75"
  price_eur     numeric(10,2),   -- parsed numeric price in EUR
  top4000       boolean not null default false,
  top2023       smallint,        -- ranking 1-4000 or null
  top2024       smallint,
  top2025       smallint,
  top2026       smallint,
  cover_path    text,            -- Supabase Storage path or null
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Full-text search index
alter table songs add column fts tsvector
  generated always as (
    to_tsvector('simple',
      coalesce(artist,'') || ' ' ||
      coalesce(title,'') || ' ' ||
      coalesce(genre,'') || ' ' ||
      coalesce(country,'')
    )
  ) stored;

create index idx_songs_fts        on songs using gin (fts);
create index idx_songs_artist     on songs (artist);
create index idx_songs_title      on songs (title);
create index idx_songs_year       on songs (year);
create index idx_songs_genre      on songs (genre);
create index idx_songs_format     on songs (format);
create index idx_songs_top4000    on songs (top4000);
create index idx_songs_top2023    on songs (top2023);
create index idx_songs_top2024    on songs (top2024);
create index idx_songs_created    on songs (created_at desc);
create index idx_songs_artist_trgm on songs using gin (artist gin_trgm_ops);
create index idx_songs_title_trgm  on songs using gin (title gin_trgm_ops);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_songs_updated
  before update on songs
  for each row execute function update_updated_at();

-- ============================================================
-- 2. TOP 1000 — personal ranking (separate from collection)
-- ============================================================
create table top1000 (
  id            uuid primary key default uuid_generate_v4(),
  position      smallint not null unique,
  artist        text not null,
  title         text not null,
  year          smallint,
  song_id       uuid references songs(id) on delete set null  -- optional link to owned copy
);

create index idx_top1000_position on top1000 (position);

-- ============================================================
-- 3. TOP 4000 LISTS — external radio station rankings by year
-- ============================================================
create table top4000_lists (
  id            uuid primary key default uuid_generate_v4(),
  list_year     smallint not null,   -- 2023, 2024, 2025
  position      smallint not null,
  artist        text not null,
  title         text not null,
  song_year     smallint,
  unique (list_year, position)
);

create index idx_top4000_year     on top4000_lists (list_year);
create index idx_top4000_pos      on top4000_lists (list_year, position);
create index idx_top4000_artist   on top4000_lists (artist);

-- ============================================================
-- 4. Storage bucket for covers
-- ============================================================
-- Run in Supabase dashboard > Storage > New bucket:
--   Name: covers
--   Public: true
-- Or via SQL:
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

-- Allow public read
create policy "Public cover read"
  on storage.objects for select
  using (bucket_id = 'covers');

-- Allow authenticated upload/delete (or anon if no auth)
create policy "Anyone can upload covers"
  on storage.objects for insert
  with check (bucket_id = 'covers');

create policy "Anyone can update covers"
  on storage.objects for update
  using (bucket_id = 'covers');

create policy "Anyone can delete covers"
  on storage.objects for delete
  using (bucket_id = 'covers');

-- ============================================================
-- 5. Row Level Security — open for v1 (no auth)
-- ============================================================
alter table songs enable row level security;
alter table top1000 enable row level security;
alter table top4000_lists enable row level security;

create policy "Public read songs"  on songs        for select using (true);
create policy "Public write songs" on songs        for all    using (true);
create policy "Public read top1000"  on top1000      for select using (true);
create policy "Public write top1000" on top1000      for all    using (true);
create policy "Public read top4000"  on top4000_lists for select using (true);
create policy "Public write top4000" on top4000_lists for all    using (true);

-- ============================================================
-- 6. Useful views
-- ============================================================
create or replace view collection_stats as
select
  count(*)::int                                        as total_songs,
  count(distinct artist)::int                          as total_artists,
  count(distinct genre) filter (where genre is not null and genre <> '')::int as total_genres,
  count(distinct format)::int                          as total_formats,
  coalesce(sum(price_eur), 0)::numeric(10,2)           as total_value,
  count(*) filter (where top4000 = true)::int          as top4000_count,
  count(*) filter (where cover_path is not null)::int  as with_covers,
  min(year)::int                                       as earliest_year,
  max(year)::int                                       as latest_year
from songs;
