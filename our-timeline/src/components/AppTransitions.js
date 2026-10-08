"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import LoadingTitle from "@/components/LoadingTitle";
import { memoryPhotoTransitionName as photoLayoutId } from "@/lib/viewTransitions";

const TransitionContext = createContext(null);
// The first paint uses CSS; shader setup must not delay the loading title.
const AnimatedBackground = dynamic(() => import("@/components/AnimatedBackground"), { ssr: false });
export { photoLayoutId };
export const useAppTransitions = () => useContext(TransitionContext);

export default function AppTransitions({ children }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const [splash, setSplash] = useState(true);
  const [gate, setGate] = useState(null);
  const [photo, setPhoto] = useState(null);
  const holdGate = useCallback((content) => setGate({ content }), []);
  const bridgePhoto = useCallback((snapshot) => setPhoto(snapshot), []);
  const finishPhoto = useCallback(() => setPhoto(null), []);

  useEffect(() => {
    // Fonts enhance the painted page instead of blocking its initial CSS.
    if (!document.getElementById("app-fonts")) {
      const fonts = document.createElement("link");
      fonts.id = "app-fonts";
      fonts.rel = "stylesheet";
      fonts.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap";
      document.head.appendChild(fonts);
    }
    const timer = setTimeout(() => setSplash(false), reducedMotion ? 0 : 450);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(() => {
    if (!photo) return;
    // Safety cleanup for canceled/failed navigation; the hero normally clears it.
    const timer = setTimeout(finishPhoto, 8000);
    return () => clearTimeout(timer);
  }, [photo, finishPhoto]);

  return (
    <TransitionContext.Provider value={{ splash, holdGate, bridgePhoto, finishPhoto, photo }}>
      {/* This group persists in layout.js. App Router replaces page subtrees,
          so a fixed source bridges the unmount until the detail hero joins
          the SAME layoutId. No router-internal context freezing needed. */}
      <LayoutGroup id="memories">
        <AnimatedBackground />
        <motion.div className="app-viewport relative flex flex-1 flex-col"
          inert={splash} initial={{ opacity: 0 }} animate={{ opacity: splash ? 0 : 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.45 }}>
          {children}
        </motion.div>
        <AnimatePresence onExitComplete={() => { if (pathname !== "/gate") setGate(null); }}>
          {splash && <motion.div key="splash"
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
        {photo && <motion.div className="shared-photo-bridge" aria-hidden="true"
          layoutId={photoLayoutId(photo.id)} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ top: photo.rect.top, left: photo.rect.left, width: photo.rect.width, height: photo.rect.height }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} alt="" className="shared-photo-bridge-image" style={photo.imageStyle} />
        </motion.div>}
      </LayoutGroup>
    </TransitionContext.Provider>
  );
}

export function RouteReveal({ children, detail = false }) {
  const reducedMotion = useReducedMotion();
  return <motion.div className="flex flex-1 flex-col"
    initial={{ opacity: reducedMotion ? 1 : 0, y: detail || reducedMotion ? 0 : 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: reducedMotion ? 0 : 0.45, delay: detail && !reducedMotion ? 0.12 : 0 }}>
    {children}
  </motion.div>;
}
