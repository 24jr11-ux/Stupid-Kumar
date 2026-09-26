export function memoryPhotoTransitionName(memoryId) {
  const safeId = String(memoryId ?? "memory").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `memory-photo-${safeId}`;
}
