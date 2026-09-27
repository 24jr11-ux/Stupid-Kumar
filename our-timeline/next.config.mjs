import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
