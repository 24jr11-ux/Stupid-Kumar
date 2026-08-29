# Stupid & Kumar — Our Timeline

A private, passphrase-gated memory timeline built with **Next.js 16 (App Router)**, **Tailwind CSS 4**, **Supabase**, and **next-pwa**.

- 🔐 A passphrase gate (passphrase from the environment, never hardcoded) unlocks everything
- ⏱️ Live count-up clock since a start date you set in `src/app/page.js`
- 📅 Vertical timeline of memories, ordered by entry number
- 📸 Per-memory photo galleries uploaded to Supabase Storage
- 🎵 Embedded Spotify / YouTube player per memory
- 🔞 A per-memory NSFW section hidden behind a toggle
- 📱 Installable PWA with a Workbox service worker

## Required environment variables

Copy `.env.example` to `.env.local` and fill in real values:

| Variable                       | Description                                             |
| ------------------------------ | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`     | Your Supabase project URL, e.g. `https://abc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (Supabase → Settings → API)             |
| `PASSPHRASE`                   | The passphrase visitors must enter to unlock the site   |

> `.env.local` is gitignored. Never commit it.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run [`schema.sql`](./schema.sql). This creates:
   - the `memories` table (all fields the form uses),
   - RLS policies that allow reads/writes via the public anon key (this is a private, passphrase-gated app),
   - a public `memories` storage bucket (10 MB max per image) with read/upload policies.
3. Copy your project URL and anon key into `.env.local`.

The photo upload helper lives in `src/lib/supabase.js` (`uploadPhoto`) — it uploads to the `memories` bucket and returns a public URL stored in `memories.photo_urls`.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your `PASSPHRASE`, and you're in.

- `npm run dev` / `npm run build` use `--webpack` because the `next-pwa` plugin hooks into webpack (Next 16 defaults to Turbopack).
- The service worker (`/sw.js`) is generated into `public/` at build time.
- Set a start date for the count-up clock at the top of `src/app/page.js` (`RELATIONSHIP_START_DATE`).

## Deploying to Vercel

1. Push the repo to GitHub/GitLab/Bitbucket and import it into [Vercel](https://vercel.com).
2. In the project settings, add the three environment variables from above.
3. The build command is `npm run build` (which runs `next build --webpack`).
4. Deploy. The passphrase gate will be active from the first visit.

> The service worker needs HTTPS — Vercel provides it automatically.
> If self-hosting, add `Cache-Control: no-cache` for `/sw.js` (see the PWA docs).

## Project structure

```
src/proxy.js                     # Next 16 "middleware" — the passphrase gate
src/app/gate/                    # Passphrase entry page + unlock server action
src/lib/auth.js                  # Passphrase/cookie helpers (env-driven)
src/lib/supabase.js              # Supabase client + photo upload helper
src/lib/player.js                # Spotify/YouTube → embed URL parser
src/lib/dates.js                 # Date formatting
src/app/page.js                  # Count-up clock + vertical timeline home
src/app/memory/[id]/page.js      # Memory detail page
src/app/memory/new/page.js       # Add a memory
src/app/memory/[id]/edit/page.js # Edit a memory
src/components/MemoryForm.js     # Shared add/edit form (all schema fields)
src/components/MemoryDetail.js   # Detail view: gallery, NSFW toggle, song player
src/components/CountupClock.js   # Live count-up clock
src/components/SWRegister.js     # Service worker registration
schema.sql                       # Table + RLS + storage bucket setup
```

Nothing personal is hardcoded — every bit of content goes through the form into Supabase.