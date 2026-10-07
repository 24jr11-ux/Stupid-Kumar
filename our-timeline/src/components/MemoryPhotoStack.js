"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { photoSrc } from "@/lib/photoUrl";

export default function MemoryPhotoStack({ photos, title }) {
  const [selected, setSelected] = useState(0);
  const touchStart = useRef(null);
  const reducedMotion = useReducedMotion();
  const active = Math.min(selected, photos.length - 1);
  const select = (index) => setSelected((index + photos.length) % photos.length);

  return (
    <section aria-label="Memory photos" className="photo-stack"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          select(active + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}>
      <div className={`photo-stack-layout ${photos.length === 1 ? "photo-stack-layout--single" : ""}`}>
        <div className="photo-stack-stage"
          onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
          onTouchEnd={(event) => {
            if (touchStart.current === null) return;
            const distance = touchStart.current - event.changedTouches[0].clientX;
            if (Math.abs(distance) > 45) select(active + (distance > 0 ? 1 : -1));
            touchStart.current = null;
          }}
          onTouchCancel={() => { touchStart.current = null; }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={photos[active]} className="memory-photo-frame photo-stack-active"
              initial={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.91 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.91 }}
              transition={{ duration: reducedMotion ? 0 : 0.12, ease: "easeOut" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoSrc(photos[active])} alt={`${title || "Memory"} — photo ${active + 1}`}
                draggable={false} className="photo-stack-image" />
            </motion.div>
          </AnimatePresence>
        </div>
        {photos.length > 1 && (
          <div className="photo-stack-strip" aria-label="Choose a photo">
            {photos.map((url, index) => (
              <button key={url} type="button" className="photo-stack-thumbnail"
                aria-label={`Show photo ${index + 1}`} aria-pressed={index === active}
                onClick={() => select(index)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoSrc(url)} alt="" loading="lazy" draggable={false} />
              </button>
            ))}
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <div className="photo-stack-controls">
          <button type="button" onClick={() => select(active - 1)} aria-label="Previous photo"><ChevronLeft size={20} /></button>
          <span className="scrapbook-text font-mono text-xs tabular-nums" aria-live="polite">{active + 1} / {photos.length}</span>
          <button type="button" onClick={() => select(active + 1)} aria-label="Next photo"><ChevronRight size={20} /></button>
        </div>
      )}
    </section>
  );
}
