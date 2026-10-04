"use client";

import { useRef, useState } from "react";
import { cropImageStyle, cropPosition, cropZoom } from "@/lib/imageCrop";

export default function ImageFramingEditor({ src, alt, position, zoom, onChange, label = "Artwork" }) {
  const [size, setSize] = useState(null);
  const drag = useRef(null);
  const point = cropPosition(position);
  const scale = cropZoom(zoom);

  function pointerDown(event) {
    const frame = event.currentTarget.getBoundingClientRect();
    const ratio = size ? size.width / size.height : 1;
    drag.current = {
      x: event.clientX, y: event.clientY, position: point,
      width: Math.max(frame.width, frame.height * ratio) * scale,
      height: Math.max(frame.height, frame.width / ratio) * scale,
      frameWidth: frame.width, frameHeight: frame.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event) {
    const start = drag.current;
    if (!start) return;
    const availableX = start.width - start.frameWidth;
    const availableY = start.height - start.frameHeight;
    const clamp = (n) => Math.max(0, Math.min(100, n));
    onChange({
      position: {
        x: availableX ? clamp(start.position.x - (event.clientX - start.x) / availableX * 100) : 50,
        y: availableY ? clamp(start.position.y - (event.clientY - start.y) / availableY * 100) : 50,
      },
      zoom: scale,
    });
  }

  return (
    <div className="w-full min-w-0">
      <div
        className="relative mx-auto aspect-square w-full max-w-[min(72vw,19rem)] touch-none select-none overflow-hidden bg-[#261A16] cursor-grab active:cursor-grabbing"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src} alt={alt} draggable={false}
          onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          className="absolute inset-0 h-full w-full select-none"
          style={cropImageStyle(point, scale)}
        />
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm text-[#FAF7F2]">
        <span className="shrink-0">{label} zoom</span>
        <input type="range" min="1" max="3" step="0.05" value={scale}
          onChange={(event) => onChange({ position: point, zoom: Number(event.target.value) })}
          className="h-11 min-w-0 flex-1 accent-[#76513E]" aria-label={`${label} zoom`} />
        <span className="w-10 text-right font-mono text-xs tabular-nums">{scale.toFixed(2)}×</span>
      </label>
      <p className="mt-2 text-xs text-[#D4C8BA]">Drag the image to position it in the square.</p>
    </div>
  );
}
