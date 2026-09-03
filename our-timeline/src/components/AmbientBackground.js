"use client";

import { VIVID_ORANGE, VIVID_WARM_GREEN } from "@/lib/colors";

/**
 * AmbientBackground
 *
 * Vivid, multi-blob animated lava lamp background.
 * Uses `mix-blend-mode: screen` so overlapping radial glow blobs brighten and
 * blend like illumination (producing luminous golden amber when orange & green overlap)
 * without ever getting muddy.
 *
 * All animations are GPU-accelerated (transform: translate + scale) for silky 60fps
 * smoothness and battery efficiency on mobile.
 */
export default function AmbientBackground({ mode = "home", colorTag }) {
  if (mode === "detail") {
    const dominantColor = colorTag || VIVID_ORANGE;
    const accentColor = dominantColor.toLowerCase() === VIVID_ORANGE.toLowerCase() ? VIVID_WARM_GREEN : VIVID_ORANGE;

    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0 min-h-full"
      >
        {/* Blob 1: Dominant memory color — Top Center */}
        <div
          className="blob-screen animate-lava-1 absolute -top-24 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full opacity-85 blur-[75px] sm:h-[680px] sm:w-[680px] sm:blur-[105px]"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${dominantColor} 0%, transparent 70%)`,
          }}
        />

        {/* Blob 2: Complementary accent — Top Right */}
        <div
          className="blob-screen animate-lava-2 absolute -top-10 -right-16 h-[440px] w-[440px] rounded-full opacity-75 blur-[70px] sm:h-[580px] sm:w-[580px] sm:blur-[100px]"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accentColor} 0%, transparent 70%)`,
          }}
        />

        {/* Blob 3: Dominant color — Mid Left */}
        <div
          className="blob-screen animate-lava-3 absolute top-72 -left-20 h-[460px] w-[460px] rounded-full opacity-70 blur-[75px] sm:h-[600px] sm:w-[600px] sm:blur-[105px]"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${dominantColor} 0%, transparent 70%)`,
          }}
        />

        {/* Blob 4: Golden warmth — Lower Center */}
        <div
          className="blob-screen animate-lava-4 absolute top-[580px] left-1/3 h-[420px] w-[420px] rounded-full opacity-65 blur-[75px] sm:h-[540px] sm:w-[540px] sm:blur-[100px]"
          style={{
            background: "radial-gradient(circle at 50% 50%, #D47E28 0%, transparent 70%)",
          }}
        />
      </div>
    );
  }

  // Home mode: 6 screen-blended lava lamp blobs (Burnt Orange + Vivid Warm Green + Golden Amber)
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0 min-h-full"
    >
      {/* Blob 1: Burnt Orange (#C85A32) — Top Right */}
      <div
        className="blob-screen animate-lava-1 absolute -top-16 -right-16 h-[480px] w-[480px] rounded-full opacity-90 blur-[75px] sm:h-[640px] sm:w-[640px] sm:blur-[105px]"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${VIVID_ORANGE} 0%, transparent 70%)`,
        }}
      />

      {/* Blob 2: Vivid Warm Green (#96B82D) — Top Left */}
      <div
        className="blob-screen animate-lava-2 absolute -top-10 -left-20 h-[460px] w-[460px] rounded-full opacity-85 blur-[70px] sm:h-[600px] sm:w-[600px] sm:blur-[100px]"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${VIVID_WARM_GREEN} 0%, transparent 70%)`,
        }}
      />

      {/* Blob 3: Burnt Orange (#C85A32) — Mid-Left Floating */}
      <div
        className="blob-screen animate-lava-3 absolute top-[360px] -left-28 h-[500px] w-[500px] rounded-full opacity-80 blur-[80px] sm:h-[660px] sm:w-[660px] sm:blur-[110px]"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${VIVID_ORANGE} 0%, transparent 70%)`,
        }}
      />

      {/* Blob 4: Vivid Warm Green (#96B82D) — Mid-Right Floating */}
      <div
        className="blob-screen animate-lava-4 absolute top-[440px] -right-24 h-[480px] w-[480px] rounded-full opacity-80 blur-[75px] sm:h-[620px] sm:w-[620px] sm:blur-[105px]"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${VIVID_WARM_GREEN} 0%, transparent 70%)`,
        }}
      />

      {/* Blob 5: Glowing Amber (#D47E28) — Center Cross-over (desktop extra) */}
      <div
        className="blob-screen animate-lava-5 hidden md:block absolute top-[180px] left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full opacity-75 blur-[85px]"
        style={{
          background: "radial-gradient(circle at 50% 50%, #D47E28 0%, transparent 70%)",
        }}
      />

      {/* Blob 6: Burnt Orange / Green blend — Lower Timeline (desktop extra) */}
      <div
        className="blob-screen animate-lava-6 hidden md:block absolute top-[820px] left-1/4 h-[560px] w-[560px] rounded-full opacity-70 blur-[90px]"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${VIVID_ORANGE} 0%, transparent 70%)`,
        }}
      />
    </div>
  );
}
