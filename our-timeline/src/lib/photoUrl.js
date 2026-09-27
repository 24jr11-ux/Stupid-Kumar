export function photoSrc(url) {
  return url?.includes(".private.blob.vercel-storage.com/")
    ? `/api/photos?url=${encodeURIComponent(url)}`
    : url;
}
