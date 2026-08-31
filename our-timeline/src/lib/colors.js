// Curated warm, cozy, fall-inspired color palette for timeline memories.
// These 8 colors are designed to harmonize with the cream base and warm typography.

export const MEMORY_COLOR_TAGS = [
  {
    id: "terracotta",
    label: "Burnt Terracotta",
    hex: "#C85A32",
    bgLight: "#FBF0EA",
    border: "#E8BAA6",
    text: "#933B19",
  },
  {
    id: "pumpkin",
    label: "Warm Pumpkin",
    hex: "#D97736",
    bgLight: "#FCF3EB",
    border: "#ECC09E",
    text: "#A24E1A",
  },
  {
    id: "amber",
    label: "Golden Amber",
    hex: "#C98A2C",
    bgLight: "#FBF4E7",
    border: "#EACD96",
    text: "#915E12",
  },
  {
    id: "sage",
    label: "Sage Green",
    hex: "#5C7A60",
    bgLight: "#EFF4F0",
    border: "#B4C8B7",
    text: "#3D5641",
  },
  {
    id: "forest",
    label: "Forest Moss",
    hex: "#3B5E45",
    bgLight: "#ECF2EE",
    border: "#9FBDA7",
    text: "#243E2C",
  },
  {
    id: "dusty-rose",
    label: "Dusty Rose",
    hex: "#A85858",
    bgLight: "#F8EEEE",
    border: "#D8B2B2",
    text: "#793636",
  },
  {
    id: "warm-almond",
    label: "Warm Almond",
    hex: "#9E7D56",
    bgLight: "#F7F3EE",
    border: "#D4C2AB",
    text: "#6F5233",
  },
  {
    id: "espresso",
    label: "Deep Espresso",
    hex: "#4A352F",
    bgLight: "#F0ECEB",
    border: "#AFA19D",
    text: "#32211D",
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
