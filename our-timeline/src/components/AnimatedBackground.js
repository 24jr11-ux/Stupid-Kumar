"use client";

import { ShaderMount } from "@paper-design/shaders-react";
import {
  defaultObjectSizing,
  getShaderColorFromString,
  meshGradientFragmentShader,
  ShaderFitOptions,
} from "@paper-design/shaders";
import { VIVID_WARM_GREEN } from "@/lib/colors";

const BACKGROUND_ORANGE = "#F47A1F";

// Keep MeshGradient's original positions, distortion, swirl, and timing, while
// making the nearest color hold its hue more strongly. Dimming the shared
// field keeps orange/green overlaps in dusk midtones rather than neon yellow.
const flowingColorShader = meshGradientFragmentShader
  .replace("dist = pow(dist, 3.5);", "dist = pow(dist, 5.0);")
  .replace("float totalWeight = 0.;", "float totalWeight = 0.;\n  float strongestWeight = 0.;")
  .replace("totalWeight += weight;", "totalWeight += weight;\n    strongestWeight = max(strongestWeight, weight);")
  .replace(
    "color /= max(1e-4, totalWeight);",
    "color /= max(1e-4, totalWeight);\n  float overlap = 1. - strongestWeight / max(1e-4, totalWeight);\n  color *= 0.76 - 0.20 * overlap;"
  );

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
 *     - BACKGROUND_ORANGE #F47A1F
 *     - VIVID_WARM_GREEN  #9EDB45
 *   The colors flow together with the shader's original organic blending.
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
 *   opaque on the calling pages; dusk luminance is handled inside the
 *   shader.
 *
 * PERFORMANCE
 *   WebGL / GPU-accelerated. `maxPixelCount` caps the render surface so it
 *   stays smooth on mid-range mobile viewports (this is a PWA meant to run
 *   installed on phones).
 */

export default function AnimatedBackground({ colorTag = null, className = "" }) {
  // Base two-color palette (orange + green).
  const baseColors = [BACKGROUND_ORANGE, VIVID_WARM_GREEN];

  // On detail pages, bias toward the memory's color_tag: put it in the palette
  // (first = dominant) alongside the two app colors so it leads the blend.
  const colors =
    colorTag && colorTag !== BACKGROUND_ORANGE
      ? [colorTag, BACKGROUND_ORANGE, VIVID_WARM_GREEN]
      : baseColors;

  const uniforms = {
    u_colors: colors.map(getShaderColorFromString),
    u_colorsCount: colors.length,
    u_distortion: 0.75,
    u_swirl: 0.4,
    u_grainMixer: 0.15,
    u_grainOverlay: 0.01,
    u_fit: ShaderFitOptions.cover,
    u_scale: defaultObjectSizing.scale,
    u_rotation: defaultObjectSizing.rotation,
    u_offsetX: defaultObjectSizing.offsetX,
    u_offsetY: defaultObjectSizing.offsetY,
    u_originX: defaultObjectSizing.originX,
    u_originY: defaultObjectSizing.originY,
    u_worldWidth: defaultObjectSizing.worldWidth,
    u_worldHeight: defaultObjectSizing.worldHeight,
  };

  return (
    <div
      aria-hidden="true"
      className={`ambient-background pointer-events-none fixed inset-0 z-0 ${className}`}
    >
      <ShaderMount
        fragmentShader={flowingColorShader}
        uniforms={uniforms}
        speed={0.3}
        maxPixelCount={700_000}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
