import { createClient } from "@supabase/supabase-js";

// Bucket where memory photos are stored (must exist in your Supabase project —
// schema.sql creates it for you).
export const PHOTO_BUCKET = "memories";

// Title used as a folder prefix inside the bucket, e.g. "memories/7/...".
const ENTITY_PATH = "memories";

// Anon-key client. Safe to use from both Server Components and the browser
// because the anon key is a public credential; Row Level Security is left
// open by the starter schema.sql (this is a private, passphrase-gated app).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

// Uploads one photo to Supabase Storage and returns its public URL.
// `folder` keeps things tidy (use the memory's entry_number or id).
export async function uploadPhoto(file, folder = "general") {
  if (!file) throw new Error("uploadPhoto requires a file");

  // Unique, URL-safe filename so re-uploading the same file never collides.
  const safeBase = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
  const filename = `${Date.now()}-${safeBase}`;
  const path = `${ENTITY_PATH}/${folder}/${filename}`;

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  // The bucket is public, so this URL is directly usable in an <img>/next/image.
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}