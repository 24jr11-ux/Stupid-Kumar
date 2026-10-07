// Curated warm, cozy, fall-inspired color palette for timeline memories.
// Base background is Deep Espresso (#4A352F) with solid opaque rich espresso cards (#382722).

export const BASE_ESPRESSO = "#4A352F";
export const SOLID_PANEL_BG = "#382722";
export const SOLID_PANEL_BORDER = "#5D433C";
export const SOLID_INPUT_BG = "#2D1E1A";
export const CREAM_FOREGROUND = "#FAF7F2";
export const MUTED_CREAM = "#D4C8BA";

// Primary Orange (exact color from the "Add Memory" button)
export const VIVID_ORANGE = "#C85A32";

// Lush, clear green paired with the primary orange in animated backgrounds.
export const VIVID_WARM_GREEN = "#4FAF63";

// Universal NSFW moments indicator styling (stable across all detail pages)
export const WARM_OLIVE_GREEN = {
  hex: "#8F9648",
  bgLight: "#2E2818",
  border: "#8F9648",
  text: "#DCE38E",
  label: "Golden Olive",
};

export const MEMORY_COLOR_TAGS = [
  {
    id: "dark-cocoa",
    label: "Dark Cocoa",
    hex: "#614537",
    bgLight: "#352820",
    border: "#614537",
    text: "#EBCDB5",
  },
  {
    id: "terracotta",
    label: "Burnt Terracotta",
    hex: "#C85A32",
    bgLight: "#48281E",
    border: "#C85A32",
    text: "#F8B79D",
  },
  {
    id: "pumpkin",
    label: "Warm Pumpkin",
    hex: "#D97736",
    bgLight: "#4A2B18",
    border: "#D97736",
    text: "#FBCBA8",
  },
  {
    id: "amber",
    label: "Golden Amber",
    hex: "#C98A2C",
    bgLight: "#483218",
    border: "#C98A2C",
    text: "#FBD693",
  },
  {
    id: "sage",
    label: "Sage Green",
    hex: "#5C7A60",
    bgLight: "#27382A",
    border: "#5C7A60",
    text: "#B9D8BD",
  },
  {
    id: "forest",
    label: "Forest Moss",
    hex: "#3B5E45",
    bgLight: "#1F3325",
    border: "#3B5E45",
    text: "#A8D2B2",
  },
  {
    id: "dusty-rose",
    label: "Dusty Rose",
    hex: "#A85858",
    bgLight: "#442222",
    border: "#A85858",
    text: "#F4C4C4",
  },
  {
    id: "warm-almond",
    label: "Warm Almond",
    hex: "#9E7D56",
    bgLight: "#3E3022",
    border: "#9E7D56",
    text: "#EAD2B9",
  },
  {
    id: "espresso",
    label: "Deep Espresso",
    hex: "#4A352F",
    bgLight: "#352520",
    border: "#74544B",
    text: "#E2D3CF",
  },
];

export const DEFAULT_COLOR_TAG = MEMORY_COLOR_TAGS[0].hex; // "#614537"

// Native color inputs return six-digit hex values. Keep older palette choices
// intact while letting a newly picked color use the existing color_tag field.
export function memoryColorHex(colorHex) {
  // Fold the short-lived rosewood default into the new cocoa default.
  if (typeof colorHex === "string" && colorHex.toLowerCase() === "#7f5262") return DEFAULT_COLOR_TAG;
  return typeof colorHex === "string" && /^#[0-9a-f]{6}$/i.test(colorHex)
    ? colorHex
    : DEFAULT_COLOR_TAG;
}

export function memoryColorIsLight(colorHex) {
  const hex = memoryColorHex(colorHex);
  const channels = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 0.38;
}

export function getColorTagConfig(colorHex) {
  const hex = memoryColorHex(colorHex);
  const found = MEMORY_COLOR_TAGS.find(
    (c) => c.hex.toLowerCase() === hex.toLowerCase()
  );
  return found || {
    id: "custom",
    label: "Custom color",
    hex,
    bgLight: `color-mix(in srgb, ${hex} 22%, #261A16)`,
    border: hex,
    text: `color-mix(in srgb, ${hex} 38%, white)`,
  };
}
