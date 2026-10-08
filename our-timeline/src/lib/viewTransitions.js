// Stable shared Motion layoutId for the timeline photo, persistent route
// bridge, and detail hero. IDs are memory-specific, never carousel-indexed.
export function memoryPhotoTransitionName(memoryId) {
  const safeId = String(memoryId ?? "memory").replace(/[^a-zA-Z0-9_-]/g, "-");
  return `memory-photo-${safeId}`;
}
