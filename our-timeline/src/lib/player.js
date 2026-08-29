// Turns a Spotify / YouTube share link into an embeddable iframe URL.
// Returns null for links we don't recognize.

export function playerEmbedUrl(url) {
  if (!url) return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  // --- Spotify ---
  if (/spotify\.com\/(intl-[a-z-]+\/)?/i.test(trimmed)) {
    const match = trimmed.match(
      /spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/i
    );
    if (match) {
      // Spotify embeds just switch the host + keep the type + id.
      return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
    }
    return null;
  }

  // --- YouTube ---
  // Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, /shorts/ID
  let videoId = null;
  const youTube = /(youtube\.com|youtu\.be)/i.test(trimmed);
  if (youTube) {
    const watch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    const short = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    const embed = trimmed.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
    const shorts = trimmed.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
    videoId = watch?.[1] || short?.[1] || embed?.[1] || shorts?.[1];
    if (videoId) {
      return `https://www.youtube-nocookie.com/embed/${videoId}`;
    }
    return null;
  }

  return null;
}