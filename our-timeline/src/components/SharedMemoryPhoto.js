"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { photoLayoutId, useAppTransitions } from "@/components/AppTransitions";

export default function SharedMemoryPhoto({ memoryId, hero = false, children, ...props }) {
  const { photo, finishPhoto } = useAppTransitions();
  const reducedMotion = useReducedMotion();
  const bridging = photo?.id === memoryId;
  useEffect(() => {
    if (!hero || !bridging) return;
    // Covers reduced motion and a destination whose bounds already match.
    const timer = setTimeout(finishPhoto, 700);
    return () => clearTimeout(timer);
  }, [hero, bridging, finishPhoto]);

  return <motion.div {...props} data-shared-photo={memoryId}
    // Home's cover and detail's hero must use this exact id. The timeline
    // relinquishes it to the persistent bridge as navigation starts.
    layoutId={!hero && bridging ? undefined : photoLayoutId(memoryId)}
    onLayoutAnimationComplete={hero && bridging ? finishPhoto : undefined}
    transition={{ layout: { duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] } }}>
    {children}
  </motion.div>;
}
