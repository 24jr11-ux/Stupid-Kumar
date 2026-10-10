"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, X } from "lucide-react";
import { MusicPlayer } from "@/components/ui/music-player";
import ImageFramingEditor from "@/components/ImageFramingEditor";
import { cropPosition, cropZoom } from "@/lib/imageCrop";
import { youtubeVideoId, youtubeSongUrl, youtubeCoverUrls } from "@/lib/player";

export default function MemorySong({ song, editMode, onChange, onMetadata }) {
  const [inputOpen, setInputOpen] = useState(false);
  const [artOpen, setArtOpen] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const id = youtubeVideoId(song.url);
  const resolved = metadata?.videoId === id ? metadata : null;
  const title = song.title ?? resolved?.title ?? "";
  const artist = song.artist ?? "";
  const cover = song.coverUrl || resolved?.coverUrl || (id ? youtubeCoverUrls(id)[0] : null);
  const needsMetadata = Boolean(id && (song.title == null || !song.coverUrl));

  useEffect(() => {
    if (!needsMetadata) return;
    const controller = new AbortController();
    fetch(`/api/song-metadata?url=${encodeURIComponent(youtubeSongUrl(song.url))}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Metadata unavailable")))
      .then((data) => {
        if (controller.signal.aborted) return;
        setMetadata(data);
        onMetadata(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setMetadata({ videoId: id, title: null, unavailable: true });
      });
    return () => controller.abort();
  }, [id, needsMetadata, song.url, onMetadata]);

  function changeUrl(value) {
    const nextId = youtubeVideoId(value);
    onChange((previous) => nextId && nextId === youtubeVideoId(previous.url)
      ? { ...previous, url: value }
      : { url: value, title: null, artist: null, coverUrl: null, coverPosition: { x: 50, y: 50 }, coverZoom: 1 });
  }

  if (!id && !editMode) return null;

  const fieldClass = "min-w-0 w-full rounded-lg border border-[#B7A58E] bg-[#FFFAF0] px-3 py-2 text-base text-[#493A30] outline-none focus:border-[#76513E] placeholder:text-[#806F5B]/60 sm:text-sm";
  return (
    <section aria-label="Now playing" className="memory-song mt-6 min-w-0">
      {!id && editMode && !inputOpen && !song.url ? (
        <button type="button" aria-label="Add a YouTube song" onClick={() => setInputOpen(true)} className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-dashed border-[#A38C73] px-4 text-sm text-[#665140] transition hover:border-[#76513E] hover:text-[#332923]">
          <Plus size={20} /> Add a song
        </button>
      ) : (
        <>
          {id && (
            <MusicPlayer key={id} className={editMode ? "record-player--editing" : undefined} src={youtubeSongUrl(song.url)} coverArt={cover} coverPosition={song.coverPosition} coverZoom={song.coverZoom} title={title || "song"} onCoverChange={(url) => onChange((current) => youtubeVideoId(current.url) === id && current.coverUrl !== url ? { ...current, coverUrl: url } : current)}
              artworkControls={editMode && cover ? (
                <button type="button" onClick={() => setArtOpen((open) => !open)} aria-expanded={artOpen} className="vinyl-artwork-control inline-flex min-h-11 items-center justify-center gap-2 text-xs font-semibold text-[#665140] underline underline-offset-4"><Pencil size={14} className="shrink-0" /> Frame vinyl artwork</button>
              ) : null}
            >
              <div className="song-copy min-w-0">
                {editMode ? (
                  <div className="space-y-2">
                    <label className="block text-[10px] text-[#665140]">Song title
                      <input aria-label="Song title" value={title} placeholder="Song title" onChange={(e) => onChange((s) => ({ ...s, title: e.target.value }))} className={`mt-1 ${fieldClass}`} />
                    </label>
                    <label className="block text-[10px] text-[#665140]">Artist
                      <input aria-label="Artist" value={artist} placeholder="Artist" onChange={(e) => onChange((s) => ({ ...s, artist: e.target.value }))} className={`mt-1 ${fieldClass}`} />
                    </label>
                  </div>
                ) : (
                  <div className="text-[#493A30]">
                    <p title={title || "Our song"} className="break-words text-sm font-semibold leading-snug sm:text-lg">{title || "Our song"}</p>
                    {artist && <p title={artist} className="mt-1 break-words text-xs text-[#78614F] sm:text-sm">{artist}</p>}
                  </div>
                )}
                {editMode && (
                  <div className="mt-0 flex flex-wrap gap-x-3 text-[10px] text-[#78614F]">
                    <button type="button" onClick={() => setInputOpen((v) => !v)} className="inline-flex min-h-11 items-center gap-1 hover:text-[#332923]"><Pencil size={12} /> Change song</button>
                    <button type="button" onClick={() => { onChange({ url: "", title: null, artist: null, coverUrl: null, coverPosition: { x: 50, y: 50 }, coverZoom: 1 }); setInputOpen(false); setArtOpen(false); }} className="inline-flex min-h-11 items-center gap-1 hover:text-[#A44228]"><X size={12} /> Remove song</button>
                  </div>
                )}
              </div>
            </MusicPlayer>
          )}
          {id && editMode && cover && artOpen && (
            <div className="mt-2 rounded-2xl border border-[#5D433C] bg-[#2D1E1A] p-3">
              <ImageFramingEditor src={cover} alt={`${title || "Song"} cover artwork preview`} position={song.coverPosition} zoom={song.coverZoom} label="Artwork"
                onChange={({ position, zoom }) => onChange((current) => ({ ...current, coverPosition: cropPosition(position), coverZoom: cropZoom(zoom) }))} />
              <p className="mt-2 text-xs text-[#D4C8BA]">The record above shows this framing. Save the memory to keep it.</p>
            </div>
          )}
          {editMode && (!id || inputOpen) && (
            <div className={id ? "mt-3" : ""}>
              <label className="sr-only" htmlFor="song-url">YouTube song link</label>
              <input id="song-url" type="url" autoFocus={inputOpen} value={song.url} onChange={(e) => changeUrl(e.target.value)} placeholder="Paste YouTube song link…" className={fieldClass} />
              {song.url && !id && <p className="mt-1 text-xs text-[#A44228]" role="status">Use a YouTube video link. Older links can be replaced or removed.</p>}
              {!id && <button type="button" className="mt-2 text-xs text-[#665140]" onClick={() => { onChange({ url: "", title: null, artist: null, coverUrl: null, coverPosition: { x: 50, y: 50 }, coverZoom: 1 }); setInputOpen(false); }}>Cancel / remove song</button>}
            </div>
          )}
          {id && editMode && !title && <p className="mt-1 text-[10px] text-[#665140]">{resolved ? "Add a title and artist if needed." : "Looking up the song title… You can also enter it."}</p>}
        </>
      )}
      <span className="console-suitcase-handle" aria-hidden="true" />
      <span className="console-latch console-latch--left" aria-hidden="true" />
      <span className="console-latch console-latch--right" aria-hidden="true" />
    </section>
  );
}
