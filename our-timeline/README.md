# Stupid & Kumar — Our Timeline

A private, question-gated memory timeline built with Next.js 16, Tailwind CSS 4, Vercel Blob, and next-pwa.

Memories, moments, colors, songs, photo URLs, and cover settings are stored in one `data/memories.json` Blob. An absent file means an empty timeline; the first memory creates it. Photos live under `photos/<memory-id>/`. No Supabase data is imported.

## Environment

Copy `.env.example` to `.env.local` and set:

- `BLOB_READ_WRITE_TOKEN`: Vercel Blob read/write token, used only on the server.
- `BLOB_STORE_ID`: ID of the same Blob store.
- `SECURITY_QUESTIONS`: JSON array of questions and accepted answers for the gate.
- `PASSPHRASE`: Optional fallback passphrase.

Set the Blob variables in the Vercel project's environment as well. The configured private Blob store is supported: authenticated server routes deliver its photos. Keep the token private. `.env.local` is ignored by git.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, answer the gate, and use the timeline. `npm run build` uses webpack for next-pwa compatibility. Set the relationship start date in `src/app/page.js`.

Run `npm run generate:icons` to regenerate the PWA icons, Apple touch icon, and favicons. The generator freezes the timeline's modified mesh gradient and draws the local Caveat lettering as paths. Its Paper Shaders attribution and license are in `scripts/`. When replacing the icons again, bump their version query in `src/app/manifest.js` and `src/app/layout.js` so cached icons refresh.

The single JSON Blob is suitable for this small private app. Writes are serialized within each server instance and merge changes into the latest Blob contents. Every write rewrites the whole JSON file, so a substantially larger timeline or frequent edits across multiple instances would need a database.
