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
-- One row per timeline entry. Everything the form collects.
-- -------------------------------------------------------------
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  entry_number integer not null,
  title text not null,
  date date not null,
  location text not null default '',
  bullets jsonb not null default '[]'::jsonb,   -- array of short strings
  description text not null default '',
  nsfw_text text,                                 -- hidden behind the NSFW toggle
  song_url text,                                  -- Spotify / YouTube link to embed
  photo_urls text[],                              -- public URLs returned by uploadPhoto
  chapter_tag text,                               -- optional chapter / season label
  created_at timestamptz not null default now()
);

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

-- Allow the anon (public) key to read and upload photos, since readers must
-- be able to fetch images and the passphrase gate covers write access from the
-- app itself.
drop policy if exists "public read memories bucket" on storage.objects;
create policy "public read memories bucket"
  on storage.objects for select
  using (bucket_id = 'memories');

drop policy if exists "public upload memories bucket" on storage.objects;
create policy "public upload memories bucket"
  on storage.objects for insert
  with check (bucket_id = 'memories');