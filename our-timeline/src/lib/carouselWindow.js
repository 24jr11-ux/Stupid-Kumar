export function carouselWindow(count, active) {
  const size = Math.min(3, Math.max(0, count));
  const start = Math.max(0, Math.min(active - 1, count - size));
  return { indices: Array.from({ length: size }, (_, i) => start + i),
    previous: start > 0 ? start - 1 : null,
    next: start + size < count ? start + size : null };
}
