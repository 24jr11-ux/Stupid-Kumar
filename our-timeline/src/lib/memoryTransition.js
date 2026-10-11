// A brief lift, restrained flight, and optional cover-to-first-photo dissolve.
export const MEMORY_TRANSITION = { lift: 90, flight: 420, settle: 180, crossfade: 420, revealDelay: 240, reveal: 220 };

export function needsCoverCrossfade(coverPhoto, firstPhoto) {
  return Boolean(coverPhoto && firstPhoto && coverPhoto !== firstPhoto);
}

export async function crossfadeLandedCover({ coverPhoto, firstPhoto, firstImage, dissolve, isCancelled,
  wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration)) }) {
  if (!needsCoverCrossfade(coverPhoto, firstPhoto) || isCancelled()) return;
  // Keep the landed cover visible if a cold request outlasts the flight.
  if (firstImage?.decode) await firstImage.decode().catch(() => {});
  if (isCancelled()) return;
  await wait(MEMORY_TRANSITION.settle);
  if (!isCancelled()) await dissolve(MEMORY_TRANSITION.crossfade);
}
