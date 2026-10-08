"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { carouselWindow } from "@/lib/carouselWindow";

export default function CarouselPagination({ count, active, onSelect, itemLabel }) {
  if (count < 2) return null;
  const { indices } = carouselWindow(count, active);
  return (
    <nav className="photo-stack-dots" aria-label={"Choose a " + itemLabel}>
      <button type="button" className="photo-stack-arrow"
        disabled={active === 0} aria-label={"Previous " + itemLabel}
        onClick={() => onSelect(active - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
      {indices.map(index => <button key={index} type="button" className="photo-stack-dot"
        aria-label={"Show " + itemLabel + " " + (index + 1) + " of " + count}
        aria-current={index === active ? "true" : undefined} onClick={() => onSelect(index)}>
        <span aria-hidden="true" />
      </button>)}
      <button type="button" className="photo-stack-arrow"
        disabled={active === count - 1} aria-label={"Next " + itemLabel}
        onClick={() => onSelect(active + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
    </nav>
  );
}
