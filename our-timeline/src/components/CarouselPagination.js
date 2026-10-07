"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { carouselWindow } from "@/lib/carouselWindow";

export default function CarouselPagination({ count, active, onSelect, itemLabel }) {
  if (count < 2) return null;
  const { indices, previous, next } = carouselWindow(count, active);
  return (
    <nav className="photo-stack-dots" aria-label={"Choose a " + itemLabel}>
      {count > 3 && <button type="button" className="photo-stack-arrow"
        disabled={previous === null} aria-label={"Show earlier " + itemLabel + "s"}
        onClick={() => onSelect(previous)}><ChevronLeft size={16} aria-hidden="true" /></button>}
      {indices.map(index => <button key={index} type="button" className="photo-stack-dot"
        aria-label={"Show " + itemLabel + " " + (index + 1) + " of " + count}
        aria-current={index === active ? "true" : undefined} onClick={() => onSelect(index)}>
        <span aria-hidden="true" />
      </button>)}
      {count > 3 && <button type="button" className="photo-stack-arrow"
        disabled={next === null} aria-label={"Show later " + itemLabel + "s"}
        onClick={() => onSelect(next)}><ChevronRight size={16} aria-hidden="true" /></button>}
    </nav>
  );
}
