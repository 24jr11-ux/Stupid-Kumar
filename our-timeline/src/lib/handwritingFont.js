// A loaded sans-serif face or an empty match must never unlock handwriting text.
export async function loadHandwritingFont(fonts, family) {
  if (!family?.trim()) return false;
  const sample = "Stupid & Kumar 0123456789";
  const facesByWeight = await Promise.all([400, 700].map((weight) =>
    fonts.load(`${weight} 48px ${family.trim()}`, sample)));
  return facesByWeight.every((faces) => faces.length > 0 &&
    faces.every((face) => face.status === "loaded"));
}
