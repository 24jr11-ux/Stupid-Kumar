export function cropPosition(value) {
  const clamp = (number, fallback) => Number.isFinite(Number(number))
    ? Math.max(0, Math.min(100, Number(number))) : fallback;
  return { x: clamp(value?.x, 50), y: clamp(value?.y, 50) };
}

export function cropZoom(value) {
  const zoom = Number(value);
  return Number.isFinite(zoom) && zoom >= 1 ? Math.min(3, zoom) : 1;
}

export function cropImageStyle(position, zoom) {
  const { x, y } = cropPosition(position);
  return {
    objectFit: "cover",
    objectPosition: `${x}% ${y}%`,
    transformOrigin: `${x}% ${y}%`,
    transform: `scale(${cropZoom(zoom)})`,
  };
}
