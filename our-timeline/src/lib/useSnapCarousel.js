"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// Shared by photos and moments within ONE memory. Native touch scrolling and
// controls both move the same scroll-snap track; neither changes the date route.
export function useSnapCarousel(count, initialIndex = 0, resetKey = "") {
  const trackRef = useRef(null);
  const [selected, setSelected] = useState(initialIndex);
  const reducedMotion = useReducedMotion();
  const active = Math.max(0, Math.min(selected, count - 1));
  const activeRef = useRef(active);

  const select = useCallback((index) => {
    const track = trackRef.current;
    if (!track || !count) return;
    const next = Math.max(0, Math.min(index, count - 1));
    activeRef.current = next;
    setSelected(next);
    track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion ? "instant" : "smooth" });
  }, [count, reducedMotion]);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track?.clientWidth) return;
    const next = Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / track.clientWidth)));
    activeRef.current = next;
    setSelected(next);
  }, [count]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Keep the same slide after orientation/viewport changes. Initial cover
    // placement happens before paint, without sliding past unrelated photos.
    const align = () => {
      activeRef.current = Math.max(0, Math.min(activeRef.current, count - 1));
      track.scrollTo({ left: activeRef.current * track.clientWidth, behavior: "instant" });
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(track);
    return () => observer.disconnect();
  }, [count, resetKey]);

  const onKeyDown = useCallback((event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (event.target.closest("input, textarea, button")) return;
    event.preventDefault();
    select(active + (event.key === "ArrowLeft" ? -1 : 1));
  }, [active, select]);

  return { trackRef, active, select, onScroll, onKeyDown };
}
