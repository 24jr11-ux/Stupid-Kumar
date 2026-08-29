import withPWA from "next-pwa";

// Derive the Supabase host from the public env var so next/image can safely
// optimize photos stored in Supabase Storage. Falls back to a wildcard so the
// app still runs before .env.local is filled in.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
let supabaseHost = "placeholder.supabase.co";
try {
  supabaseHost = new URL(supabaseUrl).hostname; // e.g. "<project-ref>.supabase.co"
} catch {
  // keep fallback value above
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Photos uploaded to Supabase Storage (public bucket).
      { protocol: "https", hostname: supabaseHost },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

// next-pwa: generates a Workbox service worker + pushes sw.js into /public at
// build time. `register: false` because we register it ourselves (App Router
// friendly) in src/components/SWRegister.js.
export default withPWA({
  dest: "public",
  register: false,
  skipWaiting: true,
  clientsClaim: true,
  // Never precache the worker files themselves or chunked images.
  publicExcludes: ["!noprecache/**/*"],
  buildExcludes: [/chunks\/images\/.*$/, /middleware-manifest\.json$/],
})(nextConfig);