"use client";

import { useEffect, useRef, useState } from "react";
import { cropImageStyle, cropPosition, cropZoom } from "@/lib/imageCrop";

export default function ImageFramingEditor({ src, alt, position, zoom, onChange, label = "Artwork", showGrid = false }) {
  const [size, setSize] = useState(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const point = cropPosition(position);
  const scale = cropZoom(zoom);
  const framing = useRef({ position: point, zoom: scale });

  useEffect(() => {
    framing.current = { position: cropPosition(position), zoom: cropZoom(zoom) };
  }, [position, zoom]);

  function beginGesture(frame) {
    const touches = [...pointers.current.values()];
    const rect = frame.getBoundingClientRect();
    const ratio = size ? size.width / size.height : 1;
    const current = framing.current;
    gesture.current = {
      touches,
      position: current.position,
      zoom: current.zoom,
      width: Math.max(rect.width, rect.height * ratio) * current.zoom,
      height: Math.max(rect.height, rect.width / ratio) * current.zoom,
      frameWidth: rect.width,
      frameHeight: rect.height,
      distance: touches.length > 1 ? Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y) : 0,
    };
  }

  function pointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    beginGesture(event.currentTarget);
  }

  function pointerMove(event) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const start = gesture.current;
    if (!start) return;
    const touches = [...pointers.current.values()];
    if (touches.length > 1 && start.touches.length > 1 && start.distance > 0) {
      const distance = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
      onChange({ position: start.position, zoom: cropZoom(start.zoom * distance / start.distance) });
      return;
    }
    if (touches.length !== 1 || start.touches.length !== 1) return;
    const availableX = start.width - start.frameWidth;
    const availableY = start.height - start.frameHeight;
    const clamp = (n) => Math.max(0, Math.min(100, n));
    onChange({
      position: {
        x: availableX > 0 ? clamp(start.position.x - (touches[0].x - start.touches[0].x) / availableX * 100) : 50,
        y: availableY > 0 ? clamp(start.position.y - (touches[0].y - start.touches[0].y) / availableY * 100) : 50,
      },
      zoom: start.zoom,
    });
  }

  function pointerEnd(event) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size) beginGesture(event.currentTarget);
    else gesture.current = null;
  }

  return (
    <div className="w-full min-w-0">
      <div
        className="relative mx-auto aspect-square w-full max-w-[min(72vw,19rem)] touch-none select-none overflow-hidden bg-[#261A16] cursor-grab active:cursor-grabbing"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src} alt={alt} draggable={false}
          onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
          className="absolute inset-0 h-full w-full select-none"
          style={cropImageStyle(point, scale)}
        />
        {showGrid && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7)]">
            <span className="absolute inset-y-0 left-1/3 border-l border-white/70" />
            <span className="absolute inset-y-0 left-2/3 border-l border-white/70" />
            <span className="absolute inset-x-0 top-1/3 border-t border-white/70" />
            <span className="absolute inset-x-0 top-2/3 border-t border-white/70" />
          </div>
        )}
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm text-[#FAF7F2]">
        <span className="shrink-0">{label} zoom</span>
        <input type="range" min="1" max="3" step="0.05" value={scale}
          onChange={(event) => onChange({ position: point, zoom: Number(event.target.value) })}
          className="h-11 min-w-0 flex-1 accent-[#76513E]" aria-label={`${label} zoom`} />
        <span className="w-10 text-right font-mono text-xs tabular-nums">{scale.toFixed(2)}×</span>
      </label>
      <p className="mt-2 text-xs text-[#D4C8BA]">Drag to position. Pinch to zoom, or use the slider.</p>
    </div>
  );
}
