"use client";

import { Warp } from "@paper-design/shaders-react";
import { VIVID_ORANGE, VIVID_WARM_GREEN } from "@/lib/colors";

/**
 * AnimatedBackground
 *
 * Full-page, fixed, animated backdrop built on the Paper Shaders WebGL Warp
 * component. Its animated color fields retain broad, distinct color regions
 * while softness and distortion keep their boundaries flowing smoothly.
 *
 * COLORS
 *   Two vivid colors reused from the app's established palette (colors.js):
 *     - VIVID_ORANGE      #C85A32
 *     - VIVID_WARM_GREEN  #4FAF63
 *   A soft light wash lifts the transition between the color fields, avoiding
 *   the dull brown produced by directly averaging orange and green.
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
  // Separate orange and green fields with a light wash so their soft overlap
  // stays luminous instead of muddy.
  const baseColors = [VIVID_ORANGE, "#FFF0D6", VIVID_WARM_GREEN];

  // On detail pages, bias toward the memory's color_tag: put it in the palette
  // (first = dominant) alongside the two app colors so it leads the blend.
  const colors =
    colorTag && colorTag !== VIVID_ORANGE
      ? [colorTag, "#FFF0D6", VIVID_ORANGE, VIVID_WARM_GREEN]
      : baseColors;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 ${className}`}
    >
      <Warp
        colors={colors}
        speed={0.3}
        shape="edge"
        shapeScale={0.55}
        proportion={0.46}
        softness={0.78}
        distortion={0.24}
        swirl={0.36}
        swirlIterations={6}
        fit="cover"
        maxPixelCount={700_000}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
