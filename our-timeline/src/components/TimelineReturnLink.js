"use client";

import Link from "next/link";
import { useRef } from "react";
import { useAppTransitions } from "@/components/AppTransitions";
import { memoryColorHex } from "@/lib/colors";

export default function TimelineReturnLink({ memory, children, ...props }) {
  const { beginTimelineReturn, memoryTransition } = useAppTransitions();
  const ref = useRef(null);
  return <Link {...props} ref={ref} href="/" scroll={false} onNavigate={(event) => {
    if (memoryTransition) { event.preventDefault(); return; }
    beginTimelineReturn({ id: memory.id, href: `/memory/${memory.id}`, color: memoryColorHex(memory.color_tag),
      page: ref.current?.closest("[data-memory-page]") });
  }}>{children}</Link>;
}
