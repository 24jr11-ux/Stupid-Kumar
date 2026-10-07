"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
      <div className="photo-stack-stage" tabIndex={photos.length > 1 ? 0 : undefined}
        aria-label={photos.length > 1 ? "Swipe to browse photos, or use the arrow keys" : undefined}
        onTouchStart={(event) => {
          if (event.touches.length === 1) {
            touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          } else touchStart.current = null;
        }}
        onTouchEnd={(event) => {
          if (!touchStart.current || photos.length < 2) return;
          const dx = touchStart.current.x - event.changedTouches[0].clientX;
          const dy = touchStart.current.y - event.changedTouches[0].clientY;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            select(active + (dx > 0 ? 1 : -1));
          }
          touchStart.current = null;
        }}
        onTouchCancel={() => { touchStart.current = null; }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={photos[active]} className="memory-photo-frame photo-stack-active"
            initial={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: reducedMotion ? 1 : 0, scale: reducedMotion ? 1 : 0.96 }}
            transition={{ duration: reducedMotion ? 0 : 0.12, ease: "easeOut" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoSrc(photos[active])} alt={`${title || "Memory"} — photo ${active + 1}`}
              draggable={false} className="photo-stack-image" />
          </motion.div>
        </AnimatePresence>
      </div>
      {photos.length > 1 && (
        <div className="photo-stack-dots" aria-label="Choose a photo">
          {photos.map((url, index) => (
            <button key={`${url}-${index}`} type="button" className="photo-stack-dot"
              aria-label={`Show photo ${index + 1}`} aria-current={index === active ? "true" : undefined}
              onClick={() => select(index)}>
              <span />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
