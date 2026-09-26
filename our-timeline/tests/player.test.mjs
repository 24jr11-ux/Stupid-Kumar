import test from "node:test";
import assert from "node:assert/strict";
import { youtubeVideoId, youtubeSongUrl, cleanSongTitle } from "../src/lib/player.js";

test("common YouTube share formats normalize to the same playback source", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123",
    "https://youtu.be/dQw4w9WgXcQ?si=example",
    "https://youtube.com/embed/dQw4w9WgXcQ",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ]) {
    assert.equal(youtubeVideoId(url), "dQw4w9WgXcQ");
    assert.equal(youtubeSongUrl(url), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  }
});

test("invalid IDs, playlists, unsupported sources, and lookalike hosts are rejected", () => {
  for (const url of [
    "https://youtube.com/watch?v=short",
    "https://youtube.com/playlist?list=PL123",
    "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://evil.test/youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ",
    "https://open.spotify.com/track/123",
    "javascript:alert(1)",
    "not a URL",
    null,
  ]) assert.equal(youtubeVideoId(url), null);
});

test("title cleaning removes promotional suffixes without guessing an artist", () => {
  assert.equal(cleanSongTitle("Frank Ocean - Nights (Official Audio)"), "Frank Ocean - Nights");
  assert.equal(cleanSongTitle("Nights (Live at the Festival)"), "Nights (Live at the Festival)");
  assert.equal(cleanSongTitle("Nights | Official Audio"), "Nights");
});
