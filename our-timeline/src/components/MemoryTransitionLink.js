"use client";

import Link from "next/link";
import { useAppTransitions } from "@/components/AppTransitions";

function isModifiedClick(event) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export default function MemoryTransitionLink({
  href,
  memoryId,
  children,
  onClick,
  ...props
}) {
  const { bridgePhoto } = useAppTransitions();

  function handleClick(event) {
    onClick?.(event);
    if (event.defaultPrevented || isModifiedClick(event)) return;

    if (!memoryId || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const source = event.currentTarget.querySelector("[data-shared-photo]");
    const image = source?.querySelector("img.photo-foreground");
    if (!source || !image) return;
    const rect = source.getBoundingClientRect();
    const style = getComputedStyle(image);
    // Capture viewport coordinates before Next scrolls/unmounts the timeline.
    // AppTransitions retains the source with the same layoutId as the hero.
    bridgePhoto({ id: memoryId, src: image.currentSrc || image.src,
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
      imageStyle: { objectFit: style.objectFit, objectPosition: style.objectPosition,
        transformOrigin: style.transformOrigin, transform: style.transform } });
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
