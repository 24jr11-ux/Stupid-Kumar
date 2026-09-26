import { cleanSongTitle, youtubeSongUrl, youtubeVideoId, youtubeCoverUrls } from "@/lib/player";

export async function GET(request) {
  const source = new URL(request.url).searchParams.get("url");
  const id = youtubeVideoId(source);
  if (!id) return Response.json({ error: "Paste a valid YouTube video link." }, { status: 400 });

  // A fixed upstream host and normalized video URL prevent arbitrary URL fetching.
  const endpoint = new URL("https://www.youtube.com/oembed");
  endpoint.searchParams.set("url", youtubeSongUrl(source));
  endpoint.searchParams.set("format", "json");
  let title = null;
  try {
    const response = await fetch(endpoint, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    });
    if (response.ok) {
      const data = await response.json();
      title = typeof data.title === "string" ? cleanSongTitle(data.title) : null;
    }
  } catch {
    // Metadata must never prevent a valid YouTube song from being played/saved.
  }
  return Response.json({ videoId: id, title, artist: null, coverUrl: youtubeCoverUrls(id)[0] });
}
