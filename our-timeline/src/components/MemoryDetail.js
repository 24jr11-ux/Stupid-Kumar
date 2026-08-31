"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  ImageOff,
  MapPin,
  Music2,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/dates";
import { playerEmbedUrl } from "@/lib/player";
import { getColorTagConfig } from "@/lib/colors";

export default function MemoryDetail({ memory }) {
  const [showNsfw, setShowNsfw] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Touch swipe handling
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const hasNsfw = !!memory.nsfw_text?.trim();
  const photoUrls = memory.photo_urls ?? [];
  const embedUrl = playerEmbedUrl(memory.song_url);
  const colorConfig = getColorTagConfig(memory.color_tag);

  function prevPhoto() {
    setActivePhotoIndex((prev) => (prev === 0 ? photoUrls.length - 1 : prev - 1));
  }

  function nextPhoto() {
    setActivePhotoIndex((prev) => (prev === photoUrls.length - 1 ? 0 : prev + 1));
  }

  function handleTouchStart(e) {
    touchStartX.current = e.targetTouches[0].clientX;
  }

  function handleTouchMove(e) {
    touchEndX.current = e.targetTouches[0].clientX;
  }

  function handleTouchEnd() {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45; // Minimum px to trigger swipe

    if (distance > minSwipeDistance) {
      // Swiped Left -> Next Photo
      nextPhoto();
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Prev Photo
      prevPhoto();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }

  return (
    <article className="relative mt-4">
      {/* Soft gradient wash behind the header / photo area */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -left-12 -right-12 h-96 rounded-b-[60px] opacity-40 blur-3xl"
        style={{
          background: `radial-gradient(ellipse at 50% 20%, ${colorConfig.hex} 0%, ${colorConfig.bgLight} 70%, transparent 100%)`,
        }}
      />

      <div className="relative">
        {/* Title & Metadata */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className="rounded-full px-3 py-1 font-mono text-xs font-bold shadow-2xs"
            style={{
              backgroundColor: colorConfig.bgLight,
              color: colorConfig.text,
              border: `1px solid ${colorConfig.border}`,
            }}
          >
            #{memory.entry_number}
          </span>

          {memory.chapter_tag && (
            <span className="rounded-full border border-[#E8E2D9] bg-[#FFFDF9] px-3 py-1 text-xs font-semibold text-[#786F6A]">
              {memory.chapter_tag}
            </span>
          )}
        </div>

        <h1 className="mt-3 font-handwriting text-4xl font-bold tracking-tight text-[#2C2523] sm:text-5xl leading-tight">
          {memory.title}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-handwriting text-xl text-[#786F6A]">
          <span>{formatDate(memory.date)}</span>
          {memory.location && (
            <span className="inline-flex items-center gap-1 font-sans text-sm text-[#8C827A]">
              <MapPin size={14} style={{ color: colorConfig.hex }} />
              {memory.location}
            </span>
          )}
        </div>

        {/* Swipeable Photo Carousel (Polaroid style) */}
        <div className="mt-8 rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-4 sm:p-6 shadow-sm">
          {photoUrls.length > 0 ? (
            <div className="relative">
              {/* Carousel Viewport */}
              <div
                className="relative aspect-4/3 sm:aspect-16/10 w-full overflow-hidden rounded-2xl bg-[#F4EFE6] select-none touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <Image
                  src={photoUrls[activePhotoIndex]}
                  alt={`${memory.title} — photo ${activePhotoIndex + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, 700px"
                  className="object-cover transition-opacity duration-300"
                  unoptimized
                  priority
                />

                {/* Left & Right Arrow Buttons (Always visible on desktop and touch for accessibility) */}
                {photoUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={prevPhoto}
                      aria-label="Previous photo"
                      className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#2C2523]/75 text-white backdrop-blur-xs transition hover:bg-[#2C2523] active:scale-95 shadow-md"
                    >
                      <ChevronLeft size={22} />
                    </button>

                    <button
                      type="button"
                      onClick={nextPhoto}
                      aria-label="Next photo"
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#2C2523]/75 text-white backdrop-blur-xs transition hover:bg-[#2C2523] active:scale-95 shadow-md"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </>
                )}
              </div>

              {/* Photo Indicator / Dots */}
              {photoUrls.length > 1 && (
                <div className="mt-4 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-[#8C827A]">
                    Photo {activePhotoIndex + 1} of {photoUrls.length}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {photoUrls.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActivePhotoIndex(i)}
                        aria-label={`Go to photo ${i + 1}`}
                        className={`h-2 rounded-full transition-all ${
                          i === activePhotoIndex
                            ? "w-6"
                            : "w-2 bg-[#DCD3C7] hover:bg-[#B8ADA1]"
                        }`}
                        style={{
                          backgroundColor:
                            i === activePhotoIndex ? colorConfig.hex : undefined,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#DFD6C9] py-14 text-center text-[#8C827A]">
              <ImageOff size={28} className="text-[#B8ADA1]" />
              <p className="font-handwriting text-2xl text-[#786F6A]">
                No photos added for this memory yet
              </p>
            </div>
          )}
        </div>

        {/* Story Description */}
        {memory.description && (
          <div className="mt-8 rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-6 sm:p-8 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#786F6A]">
              The Story
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-[#2C2523]">
              {memory.description}
            </p>
          </div>
        )}

        {/* Highlights / Bullets + NSFW toggle */}
        {(memory.bullets?.length > 0 || hasNsfw) && (
          <section className="mt-8 rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between gap-4 border-b border-[#F2ECE1] pb-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#786F6A]">
                <Sparkles size={14} style={{ color: colorConfig.hex }} />
                Highlights
              </h2>

              {hasNsfw && (
                <button
                  type="button"
                  onClick={() => setShowNsfw((v) => !v)}
                  aria-pressed={showNsfw}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
                  style={{
                    backgroundColor: showNsfw ? colorConfig.bgLight : "#FFFDF9",
                    borderColor: showNsfw ? colorConfig.border : "#DCD3C7",
                    color: showNsfw ? colorConfig.text : "#786F6A",
                  }}
                >
                  <Flame size={13} style={{ color: colorConfig.hex }} />
                  {showNsfw ? "Hide NSFW" : "Show NSFW"}
                </button>
              )}
            </div>

            <ul className="mt-5 space-y-3">
              {(memory.bullets ?? []).map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-[#2C2523]">
                  <span
                    aria-hidden
                    className="mt-2 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colorConfig.hex }}
                  />
                  <span>{bullet}</span>
                </li>
              ))}

              {/* Sensitive / NSFW text shown when toggled on */}
              {showNsfw && memory.nsfw_text && (
                <li
                  className="flex items-start gap-3 rounded-2xl p-4 text-sm sm:text-base italic leading-relaxed"
                  style={{
                    backgroundColor: colorConfig.bgLight,
                    border: `1px solid ${colorConfig.border}`,
                    color: colorConfig.text,
                  }}
                >
                  <Flame size={18} className="mt-0.5 shrink-0" style={{ color: colorConfig.hex }} />
                  <span>{memory.nsfw_text}</span>
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Embedded Music Player */}
        {embedUrl ? (
          <div className="mt-8 rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-6 shadow-xs">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#786F6A]">
              <Music2 size={15} style={{ color: colorConfig.hex }} />
              Soundtrack to this memory
            </h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-[#E8E2D9] bg-[#FAF7F2] shadow-xs">
              <iframe
                src={embedUrl}
                title={`Song for ${memory.title}`}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="h-[120px] w-full sm:h-[152px]"
              />
            </div>
          </div>
        ) : (
          memory.song_url &&
          memory.song_url.trim() && (
            <p className="mt-6 text-xs text-[#8C827A]">
              Couldn&apos;t embed song link:{" "}
              <span className="break-all font-mono">{memory.song_url}</span>
            </p>
          )
        )}
      </div>
    </article>
  );
}