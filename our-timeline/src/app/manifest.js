// PWA web app manifest (served from /manifest.webmanifest by Next.js).
// Allows the site to be installed to a phone / desktop home screen.
export default function manifest() {
  return {
    name: "Stupid & Kumar",
    short_name: "S&K",
    description: "The ever-growing timeline of us.",
    id: "/",
    start_url: "/?resume=1",
    display: "standalone",
    background_color: "#352E23",
    theme_color: "#352E23",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
