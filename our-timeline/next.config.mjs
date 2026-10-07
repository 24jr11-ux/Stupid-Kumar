import withPWA from "next-pwa";
import defaultCache from "next-pwa/cache.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// next-pwa: generates a Workbox service worker + pushes sw.js into /public at
// build time. `register: false` because we register it ourselves (App Router
// friendly) in src/components/SWRegister.js.
export default withPWA({
  dest: "public",
  cacheStartUrl: false,
  dynamicStartUrl: false,
  runtimeCaching: [
    // Private HTML, RSC responses, and gate/session APIs must never bypass expiry via a cache.
    { urlPattern: ({ url }) => url.origin === self.location.origin &&
      (url.pathname === "/" || url.pathname === "/gate" || url.pathname.startsWith("/memory/") || url.pathname.startsWith("/api/")),
      handler: "NetworkOnly" },
    ...defaultCache,
  ],
  register: false,
  skipWaiting: true,
  clientsClaim: true,
  // Never precache the worker files themselves or chunked images.
  publicExcludes: ["!noprecache/**/*"],
  buildExcludes: [/chunks\/images\/.*$/, /middleware-manifest\.json$/],
})(nextConfig);
