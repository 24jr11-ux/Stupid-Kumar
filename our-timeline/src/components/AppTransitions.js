"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import LoadingTitle from "@/components/LoadingTitle";
import { LAST_READY_PAGE_KEY } from "@/lib/launch";
import MemoryTransitionOverlay from "@/components/MemoryTransitionOverlay";
import { MEMORY_TRANSITION } from "@/lib/memoryTransition";
import { photoSrc } from "@/lib/photoUrl";
import { loadHandwritingFont } from "@/lib/handwritingFont";

const TransitionContext = createContext(null);
// The first paint uses CSS; shader setup must not delay the loading title.
const AnimatedBackground = dynamic(() => import("@/components/AnimatedBackground"), { ssr: false });
export const useAppTransitions = () => useContext(TransitionContext);

export default function AppTransitions({ children }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [splash, setSplash] = useState(true);
  const [gate, setGate] = useState(null);
  const [readyPath, setReadyPath] = useState(null);
  const [sessionReady, markSessionReady] = useState(false);
  const [memoryTransition, setMemoryTransition] = useState(null);
  const timelineScroll = useRef(null);
  const pendingTimelineReturn = useRef(null);
  const beginMemoryTransition = useCallback(({ card, ...memory }) => {
    timelineScroll.current = window.scrollY;
    const photo = card?.querySelector(".timeline-photo-display");
    const image = photo?.querySelector("img");
    // Empty/broken covers and reduced motion use the ordinary route reveal.
    if (reducedMotion || !image?.complete || !image.naturalWidth) return;
    const paper = card.cloneNode(true);
    paper.removeAttribute("href");
    paper.removeAttribute("data-memory-card");
    paper.querySelector(".timeline-photo-display").style.visibility = "hidden";
    if (memory.firstPhoto) {
      const preload = new window.Image();
      preload.src = photoSrc(memory.firstPhoto);
    }
    setMemoryTransition({ ...memory, phase: "lift", source: {
      paper, photo: photo.cloneNode(true),
      paperRect: card.getBoundingClientRect(), photoRect: photo.getBoundingClientRect(),
    } });
  }, [reducedMotion]);
  const beginTimelineReturn = useCallback(({ page, ...memory }) => {
    pendingTimelineReturn.current = { id: memory.id, scrollY: timelineScroll.current };
    const photo = page?.querySelector('.detail-photo-display[aria-hidden="false"]');
    const image = photo?.querySelector(".photo-foreground");
    if (reducedMotion || !image?.complete || !image.naturalWidth) return;
    setMemoryTransition({ ...memory, direction: "return", phase: "lift",
      source: { photo: photo.cloneNode(true), photoRect: photo.getBoundingClientRect() } });
  }, [reducedMotion]);
  const restoreTimelineScroll = useCallback((page) => {
    const pending = pendingTimelineReturn.current;
    if (!pending) return;
    pendingTimelineReturn.current = null;
    const card = Array.from(page?.querySelectorAll("[data-memory-card]") || [])
      .find((element) => element.dataset.memoryCard === pending.id);
    if (pending.scrollY !== null) window.scrollTo({ top: pending.scrollY, behavior: "instant" });
    if (card) {
      const rect = card.getBoundingClientRect();
      if (pending.scrollY === null || rect.bottom < 0 || rect.top > window.innerHeight) {
        card.scrollIntoView({ block: "center", behavior: "instant" });
      }
    }
  }, []);
  const registerMemoryTarget = useCallback((id, target) => {
    setMemoryTransition((current) => current?.id === id && !current.target
      ? { ...current, target, phase: "flight" } : current);
  }, []);
  const landMemoryTransition = useCallback((id) => {
    setMemoryTransition((current) => current?.id === id ? { ...current, phase: "landed" } : current);
  }, []);
  const completeMemoryTransition = useCallback((id) => {
    setMemoryTransition((current) => current?.id === id ? null : current);
  }, []);
  const markRouteReady = useCallback(() => setReadyPath(pathname), [pathname]);
  const holdGate = useCallback((content) => setGate({ content }), []);

  useEffect(() => {
    if (!memoryTransition) return;
    // Back, auth redirects, missing dates, or slow/failed navigation must never
    // leave an inert page or an orphaned cover blocking the app.
    const id = memoryTransition.id;
    const timeout = window.setTimeout(() => completeMemoryTransition(id), 5000);
    const frame = pathname !== "/" && pathname !== memoryTransition.href
      ? requestAnimationFrame(() => completeMemoryTransition(id)) : null;
    return () => { window.clearTimeout(timeout); if (frame !== null) cancelAnimationFrame(frame); };
  }, [memoryTransition, pathname, completeMemoryTransition]);

  useEffect(() => {
    // The local handwriting face is preloaded; reveal titles only in that face.
    let disposed = false;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-chosen-handwriting");
    loadHandwritingFont(document.fonts, family).then((loaded) => {
      if (!disposed && loaded) document.documentElement.classList.add("handwriting-ready");
    }).catch(() => {});
    if (!document.getElementById("app-fonts")) {
      const fonts = document.createElement("link");
      fonts.id = "app-fonts";
      fonts.rel = "stylesheet";
      fonts.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
      document.head.appendChild(fonts);
    }
    const frame = document.documentElement.classList.contains("warm-launch")
      ? requestAnimationFrame(() => setSplash(false)) : null;
    return () => { disposed = true; if (frame !== null) cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (readyPath !== pathname || !sessionReady) return;
    // Dismiss only when the initial route and its session check are ready.
    // Subsequent navigation never sets splash back to true.
    const frame = requestAnimationFrame(() => setSplash(false));
    if (pathname === "/gate") return () => cancelAnimationFrame(frame);
    const remember = () => {
      try {
        localStorage.setItem(LAST_READY_PAGE_KEY, JSON.stringify({
          path: window.location.pathname + window.location.search,
          readyAt: Date.now(),
        }));
      } catch { /* Resume is optional when storage is unavailable. */ }
    };
    const visibility = () => { if (document.visibilityState === "hidden") remember(); };
    remember();
    window.addEventListener("pagehide", remember);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pagehide", remember);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [readyPath, pathname, sessionReady]);

  return (
    <TransitionContext.Provider value={{ splash, holdGate, markRouteReady, markSessionReady,
      memoryTransition, beginMemoryTransition, beginTimelineReturn, restoreTimelineScroll, registerMemoryTarget }}>
        <AnimatedBackground />
        {memoryTransition && <motion.div aria-hidden="true"
          className="memory-flight-backdrop memory-detail-backdrop"
          style={{ "--date-color": memoryTransition.color }}
          initial={{ opacity: memoryTransition.direction === "return" ? 1 : 0 }}
          animate={{ opacity: memoryTransition.direction === "return" && memoryTransition.target ? 0 : 1 }}
          transition={{ duration: MEMORY_TRANSITION.flight / 1000, ease: "easeInOut" }} />}
        <motion.div className="app-viewport relative z-10 flex flex-1 flex-col"
          inert={splash || Boolean(memoryTransition)} initial={{ opacity: 0 }} animate={{ opacity: splash ? 0 : 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.45 }}>
          {children}
        </motion.div>
        {memoryTransition && <MemoryTransitionOverlay transition={memoryTransition}
          onLand={landMemoryTransition} onComplete={completeMemoryTransition} />}
        <AnimatePresence onExitComplete={() => { if (pathname !== "/gate") setGate(null); }}>
          {splash && <motion.div key="splash" className="launch-splash fixed inset-0 z-40"
            exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.45 }}>
            <LoadingTitle />
          </motion.div>}
          {gate && pathname === "/gate" && <motion.div key="departing-gate"
            className="gate-transition-overlay" inert aria-hidden="true"
            exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.45 }}
            >
            {gate.content}
          </motion.div>}
        </AnimatePresence>
    </TransitionContext.Provider>
  );
}

export function DetailPageTransition({ children, className, ...props }) {
  const reducedMotion = useReducedMotion();
  const { markRouteReady, memoryTransition, registerMemoryTarget } = useAppTransitions();
  const ref = useRef(null);
  const id = props["data-memory-page"];
  const shared = memoryTransition?.id === id && memoryTransition.direction !== "return";
  const flying = shared && memoryTransition.phase !== "landed";
  useEffect(() => { markRouteReady(); }, [markRouteReady]);
  useLayoutEffect(() => {
    if (!shared) return;
    let frame;
    // Next's scroll reset happens with route commit. Measure the actual first
    // slide after that reset, without giving the gallery a different index.
    const first = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const target = ref.current?.querySelector(".detail-photo-display");
        if (target) registerMemoryTarget(id, target);
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(frame); };
  }, [shared, id, registerMemoryTarget]);

  return <div {...props} ref={ref} className={className} data-cover-flying={flying || undefined}>
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div className="memory-detail-backdrop absolute inset-0"
        initial={{ opacity: shared ? 0 : 1 }} animate={{ opacity: shared ? 0 : 1 }}
        transition={{ duration: 0 }} />
    </div>
    <motion.div className="flex w-full justify-center"
      initial={{ opacity: reducedMotion ? 1 : 0, y: shared || reducedMotion ? 0 : 8 }}
      animate={{ opacity: shared && !memoryTransition.target ? 0 : 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : shared ? MEMORY_TRANSITION.reveal / 1000 : 0.25,
        delay: shared ? MEMORY_TRANSITION.revealDelay / 1000 : 0, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  </div>;
}

export function RouteReveal({ children, detail = false }) {
  const reducedMotion = useReducedMotion();
  const { markRouteReady, memoryTransition, restoreTimelineScroll, registerMemoryTarget } = useAppTransitions();
  const ref = useRef(null);
  const returning = memoryTransition?.direction === "return";
  useLayoutEffect(() => { restoreTimelineScroll(ref.current); }, [restoreTimelineScroll]);
  useLayoutEffect(() => {
    if (!returning || memoryTransition.target) return;
    const card = Array.from(ref.current?.querySelectorAll("[data-memory-card]") || [])
      .find((element) => element.dataset.memoryCard === memoryTransition.id);
    if (!card) return;
    const frame = requestAnimationFrame(() => registerMemoryTarget(memoryTransition.id, card));
    return () => cancelAnimationFrame(frame);
  }, [returning, memoryTransition, registerMemoryTarget]);
  useEffect(() => { markRouteReady(); }, [markRouteReady]);
  return <motion.div ref={ref} className="flex flex-1 flex-col"
    initial={{ opacity: reducedMotion || returning ? 1 : 0, y: detail || reducedMotion || returning ? 0 : 18 }}
    animate={{ opacity: memoryTransition && !returning ? 0.12 : 1, y: 0 }}
    transition={{ duration: reducedMotion ? 0 : memoryTransition ? 0.16 : 0.45, delay: detail && !reducedMotion ? 0.12 : 0 }}>
    {children}
  </motion.div>;
}
