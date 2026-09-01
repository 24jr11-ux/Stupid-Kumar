-- =============================================================
-- Stupid & Kumar — Our Timeline
-- Run this file in the Supabase SQL editor (https://supabase.com/dashboard > SQL).
-- It creates the `memories` table, opens up RLS for this private app, and
-- prepares the public `memories` storage bucket used for photos.
--
-- NOTE: photos are uploaded from the app via the JavaScript helper in
-- src/lib/supabase.js (`uploadPhoto`) — there is no SQL-side upload. That
-- helper uses Supabase Storage and returns the public URL which is then
-- stored in `memories.photo_urls`.
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- Table: memories
-- One row per timeline entry.
--
-- NOTE ON THE DATA MODEL CHANGE (moments):
-- The old schema kept the free-text pieces of a memory in separate
-- columns (`description`, `bullets` (jsonb array of strings), `nsfw_text`,
-- `location`, `chapter_tag`). That's been replaced by a single jsonb
-- `moments` array. Each element is an object shaped like:
--
--   {
--     "id": "uuid",            -- client-generated id (used as React key + dnd-kit id)
--     "text": "string",        -- the moment text
--     "is_nsfw": false,        -- hides this moment behind the NSFW toggle
--     "position": 0            -- sort order; kept in sync with drag-and-drop reorders
--   }
--
-- The moments array IS the full content of a date now — there is no
-- separate free-text description. Viewing filters on `is_nsfw`, editing
-- reorders via drag-and-drop and repersists `position`.
--
-- `color_tag` stores one of the curated warm palette hex values (see
-- src/lib/colors.js): terracotta, pumpkin, amber, sage, forest, dusty
-- rose, warm almond, espresso. It reuses the palette from the prior pass.
-- -------------------------------------------------------------
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  entry_number integer not null,
  title text not null,
  date date not null,
  moments jsonb not null default '[]'::jsonb,     -- array of { id, text, is_nsfw, position }
  song_url text,                                  -- Spotify / YouTube link to embed
  photo_urls text[],                              -- public URLs returned by uploadPhoto
  color_tag text not null default '#C85A32',     -- warm palette accent color hex
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Migration for existing installations (safe to re-run):
-- Drop the old columns and swap in `moments`. Each DROP is guarded with
-- IF EXISTS so this file can be run repeatedly against a live table.
-- Existing `bullets` rows are NOT auto-migrated to moments — the packed
-- `bullets` strings can't be meaningfully split back into discrete
-- moments, so old content is intentionally dropped with the column.
-- ---------------------------------------------------------------------
alter table public.memories drop column if exists location;
alter table public.memories drop column if exists chapter_tag;
alter table public.memories drop column if exists description;
alter table public.memories drop column if exists nsfw_text;
alter table public.memories drop column if exists bullets;
alter table public.memories add column if not exists moments jsonb not null default '[]'::jsonb;

-- If you already had an existing memories table, run this line to add the color_tag column:
alter table public.memories add column if not exists color_tag text not null default '#C85A32';

-- Cover photo: lets the user pick a specific photo + drag position for the polaroid.
-- `cover_photo_url` is the public URL of the chosen photo (falls back to photo_urls[0]).
-- `cover_photo_position` stores { x, y } as 0–100 percentages for object-position.
alter table public.memories add column if not exists cover_photo_url text;
alter table public.memories add column if not exists cover_photo_position jsonb default '{"x": 50, "y": 50}'::jsonb;

-- The timeline is ordered by entry_number, so index it for fast reads.
create index if not exists memories_entry_number_idx
  on public.memories (entry_number);

-- -------------------------------------------------------------
-- Row Level Security
-- This is a private, passphrase-gated app (the passphrase checks happen in
-- Next.js `proxy` + the /gate page), so the simplest safe-enough policy for
-- the public anon key is "allow all". Tighten this if you ever add real
-- per-user auth.
-- -------------------------------------------------------------
alter table public.memories enable row level security;

drop policy if exists "allow all on memories" on public.memories;
create policy "allow all on memories"
  on public.memories
  for all
  using (true)
  with check (true);

-- -------------------------------------------------------------
-- Storage: public "memories" bucket for uploaded photos
-- -------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memories', 'memories', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Allow the anon (public) key to read, upload, and delete photos.
drop policy if exists "public read memories bucket" on storage.objects;
create policy "public read memories bucket"
  on storage.objects for select
  using (bucket_id = 'memories');

drop policy if exists "public upload memories bucket" on storage.objects;
create policy "public upload memories bucket"
  on storage.objects for insert
  with check (bucket_id = 'memories');

drop policy if exists "public delete memories bucket" on storage.objects;
create policy "public delete memories bucket"
  on storage.objects for delete
  using (bucket_id = 'memories');