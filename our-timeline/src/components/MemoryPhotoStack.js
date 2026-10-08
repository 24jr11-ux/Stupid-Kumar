"use client";

import { photoSrc } from "@/lib/photoUrl";
import CarouselPagination from "@/components/CarouselPagination";
import SharedMemoryPhoto from "@/components/SharedMemoryPhoto";
import { useSnapCarousel } from "@/lib/useSnapCarousel";

export default function MemoryPhotoStack({ photos, title, memoryId, coverPhoto }) {
  // Start on the timeline cover so the shared photo remains the same image.
  const initialIndex = Math.max(0, photos.indexOf(coverPhoto));
  const { trackRef, active, select, onScroll, onKeyDown } = useSnapCarousel(photos.length, initialIndex);

  return <section aria-label="Memory photos" className="photo-stack">
    {/* The fixed hero frame is the layoutId destination from app/page.js.
        Only this outer viewport participates, never every carousel slide. */}
    <SharedMemoryPhoto memoryId={memoryId} hero className="memory-photo-frame">
      <div ref={trackRef} className="snap-carousel photo-carousel" onScroll={onScroll}
        onKeyDown={onKeyDown} tabIndex={photos.length > 1 ? 0 : undefined}
        aria-label="Swipe to browse photos, or use the arrow keys" role="region">
        {photos.map((photo, index) => <div key={photo} className="snap-slide photo-display detail-photo-display"
          aria-hidden={index !== active}>
          {/* Blurred cover fills the fixed area; the foreground is never cropped. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoSrc(photo)} alt="" aria-hidden="true" draggable={false} className="photo-backdrop" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoSrc(photo)} alt={`${title || "Memory"} - photo ${index + 1}`}
            draggable={false} className="photo-foreground" loading={index === initialIndex ? "eager" : "lazy"} />
        </div>)}
      </div>
    </SharedMemoryPhoto>
    <CarouselPagination count={photos.length} active={active} onSelect={select} itemLabel="photo" />
  </section>;
}
