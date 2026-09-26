# Stupid & Kumar — Our Timeline

A private, passphrase/question-gated memory timeline built with **Next.js 16 (App Router)**, **Tailwind CSS 4**, **Supabase**, and **next-pwa**.

- 🔐 **Question Gate**: Answer real personal questions read dynamically from environment variables (never committed to code).
- ⏱️ **Count-Up Clock**: Live timer tracking time together since your start date in `src/app/page.js`.
- 📸 **Polaroid Timeline**: Cozy polaroid cards with handwritten titles & dates and square cover photos.
- 🎨 **Memory Color Themes**: 8 warm, fall-inspired curated color tags (Burnt Terracotta, Warm Pumpkin, Sage Green, etc.).
- 🖼️ **Swipeable Carousel**: Mobile swipe gestures and desktop arrows for multi-photo memories.
- ⚡ **Client-Side Image Compression**: Automatic resizing before upload to keep loads fast and save storage.
- 🗑️ **Delete Memories**: Delete entries and automatically clean up associated storage files.
- 🎵 **Music Player**: Circular Componentry vinyl with in-app YouTube playback, editable song title/artist, and automatic thumbnails.
- 🔞 **NSFW Highlight Section**: Discreetly hidden behind a cozy fall-styled toggle.
- 📱 **Installable PWA**: Works on iOS and Android with custom app icons and offline support.

## Required environment variables

Copy `.env.example` to `.env.local` and fill in real values:

| Variable                       | Description                                                        |
| ------------------------------ | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`     | Your Supabase project URL, e.g. `https://abc.supabase.co`          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (Supabase → Settings → API)                        |
| `SECURITY_QUESTIONS`           | JSON array of questions and valid answers for unlocking the app    |
| `PASSPHRASE`                   | Optional fallback passphrase string                                |

Example `SECURITY_QUESTIONS` format:
```json
[
  {
    "id": 1,
    "question": "Where was our very first date?",
    "answers": ["The Garden", "Olive Garden"]
  },
  {
    "id": 2,
    "question": "What is our pet name?",
    "answers": ["Biscuit"]
  }
]
```

> `.env.local` is gitignored. Never commit real answers or API keys to git.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run [`schema.sql`](./schema.sql). This creates:
   - the `memories` table (including `color_tag` column),
   - RLS policies allowing reads/writes via the anon key,
   - the `memories` storage bucket with upload and delete permissions.
3. Copy your project URL and anon key into `.env.local`.

## Running locally

For an existing database, add the nullable song metadata columns in the Supabase SQL editor before saving memories with this version:

```sql
alter table public.memories add column if not exists song_title text;
alter table public.memories add column if not exists song_artist text;
alter table public.memories add column if not exists song_cover_url text;
```

Song links support YouTube watch, short share, embed, and Shorts URLs. Metadata uses server-side YouTube oEmbed with no API key; artist is manually editable. Existing YouTube links without metadata still render. Old non-YouTube links remain stored and can be replaced or removed in edit mode.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), answer the gate question, and explore the timeline!

- `npm run dev` and `npm run build` use `--webpack` for `next-pwa` compatibility.
- Set your relationship start date at the top of `src/app/page.js` (`RELATIONSHIP_START_DATE`).
