"use client";

import { useLayoutEffect, useRef } from "react";
import { MEMORY_TRANSITION, crossfadeLandedCover } from "@/lib/memoryTransition";

const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
const box = (rect) => ({ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });

// Lives in the root layout, so the photo survives App Router replacing home.
export default function MemoryTransitionOverlay({ transition, onLand, onComplete }) {
  return transition.direction === "return"
    ? <ReturnMemoryOverlay transition={transition} onLand={onLand} onComplete={onComplete} />
    : <ForwardMemoryOverlay transition={transition} onLand={onLand} onComplete={onComplete} />;
}

function ReturnMemoryOverlay({ transition, onLand, onComplete }) {
  const ref = useRef(null);
  const { id, source, target } = transition;
  useLayoutEffect(() => {
    const host = ref.current;
    const photo = source.photo.cloneNode(true);
    Object.assign(photo.style, box(source.photoRect), { position: "absolute", margin: "0", transform: "none" });
    host.append(photo);
    return () => host.replaceChildren();
  }, [source]);

  useLayoutEffect(() => {
    if (!target) return;
    const host = ref.current;
    const photo = host.firstElementChild;
    const destinationPhoto = target.querySelector(".timeline-photo-display");
    if (!photo || !destinationPhoto) { onComplete(id); return; }
    const cover = destinationPhoto.cloneNode(true);
    const coverImage = cover.querySelector("img");
    if (coverImage) coverImage.loading = "eager";
    Object.assign(cover.style, { position: "absolute", inset: "0", width: "100%", height: "100%", opacity: "0", zIndex: "3" });
    photo.append(cover);
    const paper = target.cloneNode(true);
    paper.removeAttribute("href");
    paper.removeAttribute("data-memory-card");
    paper.querySelector(".timeline-photo-display").style.visibility = "hidden";
    Object.assign(paper.style, box(target.getBoundingClientRect()), { position: "absolute", margin: "0", visibility: "visible", opacity: "0", transform: "none" });
    host.prepend(paper);
    const animations = [];
    const animate = (element, frames, options) => {
      const animation = element.animate(frames, { fill: "forwards", easing, ...options });
      animations.push(animation);
      return animation;
    };
    let disposed = false;
    const cancel = () => onComplete(id);
    const blockWheel = (event) => event.preventDefault();
    host.addEventListener("wheel", blockWheel, { passive: false });
    window.addEventListener("resize", cancel);
    (async () => {
      await coverImage?.decode?.().catch(() => {});
      if (disposed) return;
      const landing = animate(photo, [box(source.photoRect), box(destinationPhoto.getBoundingClientRect())], { duration: MEMORY_TRANSITION.flight });
      animate(cover, [{ opacity: 0 }, { opacity: 1 }], { duration: MEMORY_TRANSITION.flight });
      animate(paper, [{ opacity: 0 }, { opacity: 1 }], { duration: MEMORY_TRANSITION.flight, delay: 80 });
      await landing.finished.catch(() => {});
      if (disposed) return;
      onLand(id);
      await animate(host, [{ opacity: 1 }, { opacity: 0 }], { duration: 180 }).finished.catch(() => {});
      if (!disposed) onComplete(id);
    })();
    return () => {
      disposed = true;
      animations.forEach((animation) => animation.cancel());
      host.removeEventListener("wheel", blockWheel);
      window.removeEventListener("resize", cancel);
    };
  }, [id, source, target, onLand, onComplete]);
  return <div ref={ref} className="memory-flight-overlay" aria-hidden="true" />;
}

function ForwardMemoryOverlay({ transition, onLand, onComplete }) {
  const ref = useRef(null);
  const flightRef = useRef(null);
  const { id, source, coverPhoto, firstPhoto, target } = transition;

  useLayoutEffect(() => {
    const host = ref.current;
    const paper = source.paper.cloneNode(true);
    const photo = source.photo.cloneNode(true);
    const cropped = photo.querySelector("img");
    const contained = cropped.cloneNode(true);
    contained.removeAttribute("style");
    contained.className = "photo-foreground";
    contained.style.opacity = "0";
    contained.alt = "";
    const blurred = contained.cloneNode(true);
    blurred.className = "photo-backdrop";
    photo.prepend(blurred);
    photo.append(contained);
    Object.assign(paper.style, box(source.paperRect), { position: "absolute", margin: "0", transform: "none", transition: "none" });
    Object.assign(photo.style, box(source.photoRect), { position: "absolute", margin: "0", transform: "none", zIndex: "1" });
    host.append(paper, photo);
    const animations = [];
    const animate = (element, frames, options) => {
      const animation = element.animate(frames, { fill: "forwards", easing, ...options });
      animations.push(animation);
      return animation;
    };
    const liftFrames = [{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-4px) scale(1.015)" }];
    const lift = animate(photo, liftFrames, { duration: MEMORY_TRANSITION.lift });
    animate(paper, liftFrames, { duration: MEMORY_TRANSITION.lift });
    let disposed = false;
    const blockWheel = (event) => event.preventDefault();
    const cancelOnResize = () => onComplete(id);
    host.addEventListener("wheel", blockWheel, { passive: false });
    window.addEventListener("resize", cancelOnResize);
    flightRef.current = async (target) => {
      // A fast prefetched route can mount before the lift has finished.
      await lift.finished.catch(() => {});
      if (disposed) return;
      const targetRect = target.getBoundingClientRect();
      const destination = box(targetRect);
      const { flight } = MEMORY_TRANSITION;
      animate(paper, [{ opacity: 1 }, { opacity: 0, transform: "translateY(-8px) scale(1.025)" }], { duration: 160 });
      const landing = animate(photo, [
        { ...box(source.photoRect), transform: "translateY(-4px) scale(1.015)" },
        { ...destination, transform: "translateY(0) scale(1)" },
      ], { duration: flight });
      // Release the timeline crop as the same cover expands into the uncropped gallery area.
      animate(cropped, [{ opacity: 1 }, { opacity: 0 }], { duration: flight * 0.75, delay: flight * 0.25 });
      animate(contained, [{ opacity: 0 }, { opacity: 1 }], { duration: flight * 0.75, delay: flight * 0.25 });
      animate(blurred, [{ opacity: 0 }, { opacity: 0.8 }], { duration: flight });
      await landing.finished.catch(() => {});
      if (disposed) return;
      onLand(id);
      // The real gallery is already at index zero underneath this temporary cover.
      await crossfadeLandedCover({ coverPhoto, firstPhoto,
        firstImage: target.querySelector(".photo-foreground"),
        isCancelled: () => disposed,
        dissolve: (duration) => animate(photo, [{ opacity: 1 }, { opacity: 0 }], { duration }).finished.catch(() => {}),
      });
      if (!disposed) onComplete(id);
    };
    return () => {
      disposed = true;
      flightRef.current = null;
      animations.forEach((animation) => animation.cancel());
      host.removeEventListener("wheel", blockWheel);
      window.removeEventListener("resize", cancelOnResize);
      host.replaceChildren();
    };
  // The captured source stays fixed while phase/target updates arrive.
  }, [id, source, coverPhoto, firstPhoto, onLand, onComplete]);

  useLayoutEffect(() => {
    if (target) flightRef.current?.(target);
  }, [target]);

  return <div ref={ref} className="memory-flight-overlay" aria-hidden="true" />;
}
