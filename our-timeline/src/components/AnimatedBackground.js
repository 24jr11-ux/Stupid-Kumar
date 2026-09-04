"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { VIVID_ORANGE, VIVID_WARM_GREEN } from "@/lib/colors";

/**
 * AnimatedBackground
 *
 * Full-page, fixed, animated backdrop built on the Paper Shaders WebGL
 * MeshGradient component. It renders a flowing, organic multi-color blend —
 * the closest liquid/plasma aesthetic in the library (smooth flowing color
 * spots drifting through organic distortion and a slow swirl).
 *
 * COLORS
 *   Two vivid colors reused from the app's established palette (colors.js):
 *     - VIVID_ORANGE      #C85A32  (the "Add Memory" orange)
 *     - VIVID_WARM_GREEN  #96B82D  (the warm golden-green)
 *   Where the two overlap in the shader they glow rather than muddy, matching
 *   the app's existing lighten-blend golden-amber language.
 *
 *   On detail pages, a memory's color_tag can be passed in and it is added to
 *   the palette so that specific memory's tone becomes the dominant drift.
 *   Otherwise the two-color orange/green treatment is used app-wide.
 *
 * MOTION
 *   speed is set low (slow, calm, hypnotic) with mild distortion + swirl so
 *   the colors flow gently rather than churn fast or jitter.
 *
 * POSITION
 *   Rendered `fixed inset-0 -z-10 pointer-events-none` so it sits permanently
 *   behind all timeline/detail content as the user scrolls — never a hero
 *   decoration, never intercepting clicks.
 *
 * LEGIBILITY
 *   Text-bearing surfaces (polaroid cards, clock cards, panels) are kept
 *   opaque on the calling pages; no dimming overlay is added on top of the
 *   shader.
 *
 * PERFORMANCE
 *   WebGL / GPU-accelerated. `maxPixelCount` caps the render surface so it
 *   stays smooth on mid-range mobile viewports (this is a PWA meant to run
 *   installed on phones).
 */

export default function AnimatedBackground({ colorTag = null, className = "" }) {
  // Base two-color palette (orange + green).
  const baseColors = [VIVID_ORANGE, VIVID_WARM_GREEN];

  // On detail pages, bias toward the memory's color_tag: put it in the palette
  // (first = dominant) alongside the two app colors so it leads the blend.
  const colors =
    colorTag && colorTag !== VIVID_ORANGE
      ? [colorTag, VIVID_ORANGE, VIVID_WARM_GREEN]
      : baseColors;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 ${className}`}
    >
      <MeshGradient
        colors={colors}
        speed={0.3}
        distortion={0.75}
        swirl={0.4}
        grainMixer={0.15}
        grainOverlay={0.05}
        fit="cover"
        maxPixelCount={700_000}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
