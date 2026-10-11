"use client";

import { useRef } from "react";
import Link from "next/link";
import { useAppTransitions } from "@/components/AppTransitions";

export default function TimelineMemoryLink({ memoryId, color, coverPhoto, firstPhoto, children, ...props }) {
  const ref = useRef(null);
  const { beginMemoryTransition, memoryTransition } = useAppTransitions();

  return <Link {...props} ref={ref}
    data-memory-card={memoryId}
    style={{ visibility: memoryTransition?.id === memoryId && memoryTransition.phase !== "landed" ? "hidden" : undefined }}
    onNavigate={(event) => {
      // onNavigate excludes modified clicks, downloads, and new-tab navigation.
      if (memoryTransition) { event.preventDefault(); return; }
      beginMemoryTransition({ id: memoryId, href: props.href, color, coverPhoto, firstPhoto, card: ref.current });
    }}>
    {children}
  </Link>;
}
