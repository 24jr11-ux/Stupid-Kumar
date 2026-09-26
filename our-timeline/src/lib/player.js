// Only accept real YouTube hosts and a single, well-formed video ID.
export function youtubeVideoId(value) {
  if (!value || typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    let id;
    if (["youtu.be", "www.youtu.be"].includes(host)) {
      id = url.pathname.split("/")[1];
    } else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      const parts = url.pathname.split("/");
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (["embed", "shorts", "v", "live"].includes(parts[1])) id = parts[2];
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
  } catch {
    return null;
  }
}

export function youtubeSongUrl(value) {
  const id = youtubeVideoId(value);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

export function youtubeCoverUrls(id) {
  return ["maxresdefault", "sddefault", "hqdefault"].map(
    (size) => `https://i.ytimg.com/vi/${id}/${size}.jpg`
  );
}

// Remove common promotional suffixes; do not guess an artist from channel names.
export function cleanSongTitle(title) {
  return (title || "")
    .replace(/\s*[([]\s*(?:(?:official\s+)?(?:audio|music\s+video|video|lyric\s+video|lyrics)|visuali[sz]er|hd|4k)\s*[)\]]/gi, "")
    .replace(/\s*[-|]\s*(?:official\s+(?:audio|music\s+video|video)|lyrics)\s*$/i, "")
    .trim();
}
