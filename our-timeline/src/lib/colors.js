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

// Vivid, lush warm golden-green (dried sage crossed with intense golden-hour light).
// When screen-blended with Burnt Orange (#C85A32), overlaps brighten into luminous glowing amber.
export const VIVID_WARM_GREEN = "#96B82D";

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

export const DEFAULT_COLOR_TAG = MEMORY_COLOR_TAGS[0].hex; // "#C85A32"

// Helper to find configuration matching a given hex value or fallback to default
export function getColorTagConfig(colorHex) {
  if (!colorHex) return MEMORY_COLOR_TAGS[0];
  const found = MEMORY_COLOR_TAGS.find(
    (c) => c.hex.toLowerCase() === colorHex.toLowerCase()
  );
  return found || MEMORY_COLOR_TAGS[0];
}
