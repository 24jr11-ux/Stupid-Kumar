// A brief lift, restrained flight, and optional cover-to-first-photo dissolve.
export const MEMORY_TRANSITION = { lift: 70, flight: 320, crossfade: 150, revealDelay: 240, reveal: 150 };

export function needsCoverCrossfade(coverPhoto, firstPhoto) {
  return Boolean(coverPhoto && firstPhoto && coverPhoto !== firstPhoto);
}

export async function crossfadeLandedCover({ coverPhoto, firstPhoto, firstImage, dissolve, isCancelled }) {
  if (!needsCoverCrossfade(coverPhoto, firstPhoto) || isCancelled()) return;
  // Keep the landed cover visible if a cold request outlasts the flight.
  if (firstImage && !firstImage.complete) await firstImage.decode().catch(() => {});
  if (!isCancelled()) await dissolve(MEMORY_TRANSITION.crossfade);
}
