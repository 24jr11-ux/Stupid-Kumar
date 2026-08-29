"use client";

import { useState } from "react";
import Image from "next/image";
import { Flag, ImageOff, Music2 } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { playerEmbedUrl } from "@/lib/player";

// Toggle that reveals anything flagged as not-safe-for-work. Off = normal
// bullets only; on = nsfw_text (if any) appears in italic accent text.
export default function MemoryDetail({ memory }) {
  const [showNsfw, setShowNsfw] = useState(false);
  const hasNsfw = !!memory.nsfw_text?.trim();
  const photoUrls = memory.photo_urls ?? [];
  const embedUrl = playerEmbedUrl(memory.song_url);

  return (
    <article className="mt-6">
      {/* Title + meta */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
        <span className="font-mono">#{memory.entry_number}</span>
        {memory.chapter_tag && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-500">
            {memory.chapter_tag}
          </span>
        )}
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
        {memory.title}
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        {formatDate(memory.date)} {memory.location ? `· 📍 ${memory.location}` : ""}
      </p>

      {/* Photo gallery or empty state */}
      {photoUrls.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {photoUrls.map((url, i) => (
            <div
              key={url}
              className={`relative overflow-hidden rounded-2xl bg-neutral-200 ${
                i === 0 && photoUrls.length > 1 ? "sm:col-span-2" : ""
              }`}
              style={{ aspectRatio: "4 / 3" }}
            >
              <Image
                src={url}
                alt={`${memory.title} — photo ${i + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-white py-10 text-sm text-neutral-400">
          <ImageOff size={18} />
          No photos for this memory yet.
        </div>
      )}

      {/* Description */}
      {memory.description && (
        <p className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-neutral-700">
          {memory.description}
        </p>
      )}

      {/* Bullets + NSFW toggle */}
      {(memory.bullets?.length > 0 || hasNsfw) && (
        <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
              Highlights
            </h2>
            {hasNsfw && (
              <button
                type="button"
                onClick={() => setShowNsfw((v) => !v)}
                aria-pressed={showNsfw}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  showNsfw
                    ? "border-rose-300 bg-rose-50 text-rose-600"
                    : "border-neutral-300 bg-white text-neutral-500 hover:border-neutral-400"
                }`}
              >
                <Flag size={13} />
                {showNsfw ? "Hide NSFW" : "Show NSFW"}
              </button>
            )}
          </div>

          <ul className="mt-4 space-y-2">
            {(memory.bullets ?? []).map((bullet, i) => (
              <li key={i} className="flex gap-3 text-neutral-700">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-400" />
                <span>{bullet}</span>
              </li>
            ))}
            {/* NSFW text is only rendered when the toggle is on. */}
            {showNsfw && memory.nsfw_text && (
              <li className="flex gap-3 italic text-rose-600">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                <span>{memory.nsfw_text}</span>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Embedded Spotify / YouTube player */}
      {embedUrl ? (
        <div className="mt-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-neutral-500">
            <Music2 size={15} /> The song of this memory
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <iframe
              src={embedUrl}
              title={`Song for ${memory.title}`}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="h-[120px] w-full sm:h-[160px]"
            />
          </div>
        </div>
      ) : (
        memory.song_url &&
        memory.song_url.trim() && (
          <p className="mt-6 text-xs text-neutral-400">
            Couldn&apos;t embed this link:{" "}
            <span className="break-all">{memory.song_url}</span>
          </p>
        )
      )}
    </article>
  );
}