"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Flame,
  GripVertical,
  ImageOff,
  RectangleHorizontal,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/dates";
import { youtubeVideoId, youtubeSongUrl, youtubeCoverUrls } from "@/lib/player";
import MemorySong from "@/components/MemorySong";
import MemoryPhotoStack from "@/components/MemoryPhotoStack";
import CarouselPagination from "@/components/CarouselPagination";
import {
  getColorTagConfig,
  memoryColorHex,
  DEFAULT_COLOR_TAG,
} from "@/lib/colors";
import { memoryRequest } from "@/lib/memoryApi";
import { photoSrc } from "@/lib/photoUrl";
import { compressImage } from "@/lib/imageCompression";
import { cropPosition, cropZoom } from "@/lib/imageCrop";
import ImageFramingEditor from "@/components/ImageFramingEditor";
import { useSnapCarousel } from "@/lib/useSnapCarousel";

// ---------------------------------------------------------------------------
// Moments data structure
// ---------------------------------------------------------------------------
// Each memory's content lives in `memory.moments`, a jsonb array of objects:
//   { id: string(uuid), text: string, is_nsfw: boolean, position: number }
// `id` is a client-generated uuid used as the React key and drag-and-drop id.
// `position` is the sort order persisted back to the memories row on save.
// ---------------------------------------------------------------------------

function newMomentId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Initialize draft moments array with positions derived from array index.
function normalizeMoments(moments = []) {
  return moments.map((m, i) => ({
    id: m?.id || newMomentId(),
    text: m?.text ?? "",
    is_nsfw: !!m?.is_nsfw,
    position: typeof m?.position === "number" ? m.position : i,
  }));
}

// Auto-growing multi-line textarea so moment text wraps while editing.
function MomentTextarea({ value, onChange, onPasteParagraphs, placeholder, isNsfw }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      onChange={(e) => {
        const el = e.currentTarget;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight + 2}px`;
        onChange(el.value);
      }}
      onPaste={(e) => {
        const paragraphs = e.clipboardData.getData("text").trim().split(/\r?\n\s*\r?\n/).map((part) => part.trim()).filter(Boolean);
        if (paragraphs.length < 2) return;
        e.preventDefault();
        onPasteParagraphs(paragraphs, e.currentTarget.selectionStart, e.currentTarget.selectionEnd);
      }}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-transparent text-sm leading-6 text-[#332923] outline-none placeholder:text-[#806F5B]/55 ${isNsfw ? "italic" : ""}`}
    />
  );
}

function SortableMomentRow({ moment, onChange, onRemove, onPasteParagraphs, accent }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: moment.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`moment-paper flex items-start gap-2.5 p-3.5 transition ${isDragging ? "z-20 opacity-95 shadow-2xl scale-[1.01]" : ""}`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="mt-1 shrink-0 cursor-grab touch-none rounded-lg p-1 text-[#806F5B] hover:bg-black/5 hover:text-[#3E3028] active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <MomentTextarea
        value={moment.text}
        onChange={(text) => onChange(moment.id, { text })}
        onPasteParagraphs={(paragraphs, start, end) => onPasteParagraphs(moment.id, paragraphs, start, end)}
        placeholder="Write a moment…"
        isNsfw={moment.is_nsfw}
      />

      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => onRemove(moment.id)}
          aria-label="Remove moment"
          className="rounded-lg p-1.5 text-[#806F5B] transition hover:bg-black/5 hover:text-[#A44228]"
        >
          <Trash2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => onChange(moment.id, { is_nsfw: !moment.is_nsfw })}
          aria-pressed={moment.is_nsfw}
          aria-label={moment.is_nsfw ? "Remove NSFW tag from this moment" : "Mark this moment NSFW"}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#8D533E] ${
            moment.is_nsfw ? "" : "opacity-40"
          }`}
          style={{ color: accent }}
        >
          <Flame size={19} fill={moment.is_nsfw ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

function photoSortId(photo) {
  return `${photo.kind}:${photo.id}`;
}

function SortablePhotoCard({ target, index, src, current, count, onRemove, onMove, onCover }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: photoSortId(target) });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative overflow-hidden rounded-2xl border bg-[#261A16] ${current ? "border-2 border-[#76513E]" : "border-[#5D433C]"} ${isDragging ? "z-20 opacity-90 shadow-2xl" : ""}`}
    >
      <div className="relative aspect-square">
        <Image src={src} alt={`Photo ${index + 1}`} fill sizes="25vw" className="object-cover" unoptimized draggable={false} />
        {current && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#76513E] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
            <ImageIcon size={10} /> Cover
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove photo ${index + 1}`}
          className="absolute right-2 top-2 rounded-full bg-[#261A16]/90 p-1.5 text-white transition hover:bg-[#76513E]"
        >
          <X size={13} />
        </button>
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder photo ${index + 1}`}
          className="absolute bottom-2 left-2 flex h-9 w-9 cursor-grab touch-none items-center justify-center rounded-lg bg-[#261A16]/90 text-white transition hover:bg-[#76513E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </button>
      </div>
      <div className="flex items-center justify-center gap-1 border-t border-[#5D433C] bg-[#2D1E1A] py-1 text-[#D4C8BA]">
        <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label={`Move photo ${index + 1} earlier`} className="rounded p-1.5 hover:text-white disabled:opacity-30"><ChevronLeft size={17} /></button>
        <span className="min-w-5 text-center text-[11px] tabular-nums">{index + 1}</span>
        <button type="button" onClick={() => onMove(index, 1)} disabled={index === count - 1} aria-label={`Move photo ${index + 1} later`} className="rounded p-1.5 hover:text-white disabled:opacity-30"><ChevronRight size={17} /></button>
      </div>
      <button
        type="button"
        onClick={onCover}
        className={`min-h-11 w-full border-t px-2 py-2 text-center text-[11px] font-semibold transition ${current ? "border-[#76513E]/50 bg-[#76513E]/20 text-[#EBCDB5]" : "border-[#5D433C] bg-[#2D1E1A] text-[#D4C8BA] hover:bg-[#382722] hover:text-white"}`}
      >
        {current ? "Edit cover position" : "Set as cover photo"}
      </button>
    </div>
  );
}

function MomentPaper({
  moment,
  revealed,
  onReveal,
  className = "",
  variant = 0,
  inactive = false,
}) {
  const isNsfw = moment.is_nsfw;

  return (
    <li
      inert={inactive} aria-hidden={inactive || undefined}
      className={`moment-paper moment-paper--${["taped", "clipped", "folded"][variant % 3]} ${className}`}
    >
      <div className={`flex items-center justify-center px-6 text-center sm:px-9 ${isNsfw && !revealed ? "min-h-[5rem] py-4" : "min-h-[9rem] py-7 sm:min-h-[10rem] sm:py-8"}`}>
        {isNsfw ? (
          <div className="flex min-w-0 w-full flex-col items-center gap-4 italic">
            <div className="flex items-center gap-1.5 text-[#8D533E]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">NSFW</span>
              <button
                type="button"
                onClick={() => onReveal(!revealed)}
                aria-label={revealed ? "Hide this NSFW moment" : "Reveal this NSFW moment"}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-[#76513E]/10 focus-visible:outline-2 focus-visible:outline-[#8D533E]"
              >
                {revealed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            {revealed ? (
              <p className="min-w-0 max-w-prose whitespace-pre-wrap break-words text-[0.95rem] leading-7 text-[#332923] sm:text-base">
                {moment.text}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="min-w-0 max-w-prose whitespace-pre-wrap break-words text-[0.95rem] leading-7 text-[#332923] sm:text-base">
            {moment.text}
          </p>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Cover photo crop modal
// ---------------------------------------------------------------------------
function CoverCropModal({ src, title, initialPos, initialZoom, onConfirm, onCancel }) {
  const [framing, setFraming] = useState({ position: cropPosition(initialPos), zoom: cropZoom(initialZoom) });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Frame timeline cover">
      <div className="my-auto w-full max-w-md rounded-3xl border border-[#5D433C] bg-[#352520] p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#FAF7F2]">Set as cover photo</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#D4C8BA] transition hover:bg-[#261A16] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 text-xs text-[#D4C8BA]">
          Drag to center the photo within the grid. Pinch to zoom on your phone.
        </p>
        <div className="mt-4">
          <ImageFramingEditor src={src} alt={title || "Cover photo"} position={framing.position} zoom={framing.zoom} onChange={setFraming} label="Cover" showGrid />
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full px-4 py-2 text-sm font-semibold text-[#D4C8BA] transition hover:text-[#FAF7F2]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(framing)}
            className="primary-button inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition"
          >
            <Check size={15} /> Use as cover
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MemoryDetail({ memory, initialEdit = false, isNewDraft = false }) {
  const router = useRouter();

  // --- view state ----------------------------------------------------------
  const [editMode, setEditMode] = useState(initialEdit);
  const [momentsView, setMomentsView] = useState("single");
  const [forceShownIds, setForceShownIds] = useState(() => new Set());
  const [forceHiddenIds, setForceHiddenIds] = useState(() => new Set());

  // --- page-level edit fields -----------------------------------------------
  const [title, setTitle] = useState(memory.title ?? "");
  const [dateStr, setDateStr] = useState(memory.date ?? "");
  const [colorTag, setColorTag] = useState(memoryColorHex(memory.color_tag));
  const [song, setSong] = useState({
    url: memory.song_url ?? "",
    title: memory.song_title ?? null,
    artist: memory.song_artist ?? null,
    coverUrl: memory.song_cover_url ?? null,
    coverPosition: cropPosition(memory.song_cover_position),
    coverZoom: cropZoom(memory.song_cover_zoom),
  });
  const songUrl = song.url;
  const applySongMetadata = useCallback((data) => {
    setSong((current) => {
      if (youtubeVideoId(current.url) !== data.videoId) return current;
      return {
        ...current,
        title: current.title ?? data.title,
        coverUrl: current.coverUrl || data.coverUrl,
      };
    });
  }, []);
  const [photoUrls, setPhotoUrls] = useState(memory.photo_urls ?? []);
  const [newFiles, setNewFiles] = useState([]);
  const [photoOrder, setPhotoOrder] = useState(() => (memory.photo_urls ?? []).map((id) => ({ kind: "existing", id })));

  const [cover, setCover] = useState(
    memory.cover_photo_url && (memory.photo_urls ?? []).includes(memory.cover_photo_url)
      ? { kind: "existing", id: memory.cover_photo_url }
      : null
  );
  const [coverPos, setCoverPos] = useState(cropPosition(memory.cover_photo_position));
  const [coverZoom, setCoverZoom] = useState(cropZoom(memory.cover_photo_zoom));
  const [coverCrop, setCoverCrop] = useState(null);

  // --- moments edit state ---------------------------------------------------
  const [moments, setMoments] = useState(() => normalizeMoments(memory.moments ?? []));

  // --- status flags ---------------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- photo carousel -------------------------------------------------------

  const photoUrlsForCarousel = editMode
    ? photoOrder.filter((item) => item.kind === "existing").map((item) => item.id)
    : photoUrls;
  const colorConfig = getColorTagConfig(colorTag);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const photoSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const pastObjectUrls = useRef([]);
  useEffect(() => {
    const urls = pastObjectUrls.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const orderedMoments = useMemo(
    () => [...moments].sort((a, b) => a.position - b.position),
    [moments]
  );
  const viewingMoments = useMemo(
    () => orderedMoments.filter((moment) => moment.text.trim() !== ""),
    [orderedMoments]
  );
  const { trackRef: momentTrackRef, active: displayedMomentIndex,
    select: selectMoment, onScroll: onMomentScroll, onKeyDown: onMomentKeyDown } =
    useSnapCarousel(viewingMoments.length, 0, momentsView + String(editMode));
  const hasAnyMoment = moments.some((m) => m.text.trim() !== "");

  const isStillEmptyDraft =
    isNewDraft &&
    (title || "").trim() === (memory.title || "").trim() &&
    dateStr === (memory.date ?? "") &&
    !hasAnyMoment &&
    photoUrls.length === 0 &&
    newFiles.length === 0 &&
    !cover &&
    (songUrl || "").trim() === (memory.song_url || "").trim();

  // --- moments helpers ------------------------------------------------------
  function updateMoment(id, patch) {
    setMoments((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function pasteMomentParagraphs(id, paragraphs, start, end) {
    setMoments((prev) => {
      const index = prev.findIndex((moment) => moment.id === id);
      if (index < 0) return prev;
      const source = prev[index];
      const first = `${source.text.slice(0, start)}${paragraphs[0]}`;
      const last = `${paragraphs.at(-1)}${source.text.slice(end)}`;
      const inserted = [
        { ...source, text: first },
        ...paragraphs.slice(1, -1).map((text) => ({ id: newMomentId(), text, is_nsfw: source.is_nsfw })),
        { id: newMomentId(), text: last, is_nsfw: source.is_nsfw },
      ];
      return [...prev.slice(0, index), ...inserted, ...prev.slice(index + 1)]
        .map((moment, position) => ({ ...moment, position }));
    });
  }
  function removeMoment(id) {
    setMoments((prev) => prev.filter((m) => m.id !== id));
  }
  // Per-moment NSFW reveal override, independent of the global flame toggle.
  function setNsfwReveal(id, reveal) {
    setForceShownIds((prev) => {
      const next = new Set(prev);
      if (reveal) next.add(id);
      else next.delete(id);
      return next;
    });
    setForceHiddenIds((prev) => {
      const next = new Set(prev);
      if (reveal) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function addMoment() {
    const newMoment = {
      id: newMomentId(),
      text: "",
      is_nsfw: false,
      position: moments.length,
    };
    setMoments((prev) => [...prev, newMoment]);
  }
  function handleDragEnd(e) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setMoments((prev) => {
      const oldIndex = prev.findIndex((m) => m.id === active.id);
      const newIndex = prev.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((m, i) => ({
        ...m,
        position: i,
      }));
    });
  }
  // --- photo helpers --------------------------------------------------------
  function onFilesPicked(e) {
    const files = Array.from(e.target.files ?? []);
    const picked = files.map((file) => {
      const objectUrl = URL.createObjectURL(file);
      pastObjectUrls.current.push(objectUrl);
      return { id: newMomentId(), file, objectUrl };
    });
    setPhotoOrder((prev) => [...prev, ...picked.map(({ id }) => ({ kind: "new", id }))]);
    setNewFiles((prev) => [
      ...prev,
      ...picked,
    ]);
    e.target.value = "";
  }
  function removeNewFile(id) {
    setPhotoOrder((prev) => prev.filter((item) => !(item.kind === "new" && item.id === id)));
    setNewFiles((prev) => {
      const removed = prev.find((entry) => entry.id === id);
      if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl);
      return prev.filter((entry) => entry.id !== id);
    });
    setCover((prev) => (prev && prev.kind === "new" && prev.id === id ? null : prev));
  }
  function removeStoredPhoto(url) {
    setPhotoUrls((prev) => prev.filter((item) => item !== url));
    setPhotoOrder((prev) => prev.filter((item) => !(item.kind === "existing" && item.id === url)));
    setCover((prev) => (prev?.kind === "existing" && prev.id === url ? null : prev));
  }
  function movePhoto(index, direction) {
    setPhotoOrder((prev) => {
      const destination = index + direction;
      return destination < 0 || destination >= prev.length ? prev : arrayMove(prev, index, destination);
    });
  }
  function handlePhotoDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    setPhotoOrder((prev) => {
      const oldIndex = prev.findIndex((photo) => photoSortId(photo) === active.id);
      const newIndex = prev.findIndex((photo) => photoSortId(photo) === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function isCover(target) {
    return !!cover && cover.kind === target.kind && cover.id === target.id;
  }
  function coverSrcFor(target) {
    if (!target) return null;
    if (target.kind === "existing") return photoSrc(target.id);
    const entry = newFiles.find((n) => n.id === target.id);
    return entry ? entry.objectUrl ?? null : null;
  }
  function openCoverCrop(target) {
    setCoverCrop(target);
  }
  function confirmCover({ position, zoom }) {
    if (coverCrop) setCover(coverCrop);
    setCoverPos(position);
    setCoverZoom(zoom);
    setCoverCrop(null);
  }

  // --- page-level save ------------------------------------------------------
  async function handleSave() {
    if (songUrl.trim() && !youtubeVideoId(songUrl) && songUrl.trim() !== (memory.song_url || "").trim()) {
      setError("Please use a valid YouTube video link, or remove the song.");
      return;
    }
    setSaving(true);
    setError(null);
    setStatus("");

    try {
      const uploadedUrls = [];
      if (newFiles.length > 0) {
        setStatus(`Compressing ${newFiles.length} photo(s)…`);
        const compressed = [];
        for (const entry of newFiles) {
          compressed.push(await compressImage(entry.file));
        }
        setStatus("Uploading photos…");
        for (const file of compressed) {
          const form = new FormData();
          form.append("file", file);
          const uploaded = await memoryRequest(`/api/memories/${memory.id}/photos`, {
            method: "POST", body: form,
          });
          uploadedUrls.push(uploaded.url);
        }
      }

      const uploadedById = new Map(newFiles.map((entry, index) => [entry.id, uploadedUrls[index]]));
      const finalPhotoUrls = photoOrder.map((item) => item.kind === "existing" ? item.id : uploadedById.get(item.id)).filter(Boolean);

      let finalCoverUrl = null;
      if (cover) {
        if (cover.kind === "existing" && finalPhotoUrls.includes(cover.id)) {
          finalCoverUrl = cover.id;
        } else if (cover.kind === "new") {
          const idx = newFiles.findIndex((entry) => entry.id === cover.id);
          if (idx !== -1 && uploadedUrls[idx]) finalCoverUrl = uploadedUrls[idx];
        }
      }
      if (!finalCoverUrl && finalPhotoUrls.length > 0) {
        finalCoverUrl = finalPhotoUrls[0];
      }

      setStatus("Saving memory…");
      const cleanMoments = moments.filter((moment) => moment.text.trim()).map((moment, position) => ({
        ...moment, text: moment.text.trim(), position,
      }));
      await memoryRequest(`/api/memories/${memory.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moments: cleanMoments,
          title: title.trim() || "New Date",
          date: dateStr,
          color_tag: colorTag || DEFAULT_COLOR_TAG,
          song_url: youtubeSongUrl(songUrl) || songUrl.trim() || null,
          song_title: songUrl.trim() ? song.title?.trim() || null : null,
          song_artist: songUrl.trim() ? song.artist?.trim() || null : null,
          song_cover_url: songUrl.trim() ? song.coverUrl || (youtubeVideoId(songUrl) ? youtubeCoverUrls(youtubeVideoId(songUrl))[0] : null) : null,
          song_cover_position: cropPosition(song.coverPosition),
          song_cover_zoom: cropZoom(song.coverZoom),
          photo_urls: finalPhotoUrls.length > 0 ? finalPhotoUrls : null,
          cover_photo_url: finalCoverUrl || null,
          cover_photo_position: {
            x: Math.round(coverPos.x),
            y: Math.round(coverPos.y),
          },
          cover_photo_zoom: cropZoom(coverZoom),
        }),
      });

      setMoments(cleanMoments);
      setPhotoUrls(finalPhotoUrls);
      setPhotoOrder(finalPhotoUrls.map((id) => ({ kind: "existing", id })));
      setNewFiles([]);
      setEditMode(false);
      setSaving(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to save memory:", err);
      setError(err?.message || "Failed to save changes. Please try again.");
      setSaving(false);
      setStatus("");
    }
  }

  // --- delete memory row ----------------------------------------------------
  async function deleteMemoryRow() {
    setDeleting(true);
    setError(null);
    try {
      await memoryRequest(`/api/memories/${memory.id}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete memory:", err);
      setError(err?.message || "Failed to delete memory. Please try again.");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  function exitEditMode({ discard = false } = {}) {
    if (isStillEmptyDraft) {
      deleteMemoryRow();
      return;
    }
    if (discard) {
      setTitle(memory.title ?? "");
      setDateStr(memory.date ?? "");
      setColorTag(memoryColorHex(memory.color_tag));
      setSong({
        url: memory.song_url ?? "",
        title: memory.song_title ?? null,
        artist: memory.song_artist ?? null,
        coverUrl: memory.song_cover_url ?? null,
        coverPosition: cropPosition(memory.song_cover_position),
        coverZoom: cropZoom(memory.song_cover_zoom),
      });
      setPhotoUrls(memory.photo_urls ?? []);
      setPhotoOrder((memory.photo_urls ?? []).map((id) => ({ kind: "existing", id })));
      setNewFiles([]);
      setCover(
        memory.cover_photo_url && (memory.photo_urls ?? []).includes(memory.cover_photo_url)
          ? { kind: "existing", id: memory.cover_photo_url }
          : null
      );
      setCoverPos(cropPosition(memory.cover_photo_position));
      setCoverZoom(cropZoom(memory.cover_photo_zoom));
      setMoments(normalizeMoments(memory.moments ?? []));
      setError(null);
    }
    setEditMode(false);
  }

  function momentIsRevealed(moment) {
    return (
      !moment.is_nsfw ||
      (forceShownIds.has(moment.id) && !forceHiddenIds.has(moment.id))
    );
  }

  return (
    <>
      <article className="relative">
        <div className="relative z-10">
          <nav aria-label="Memory navigation" className="flex items-start justify-between gap-3">
            <Link href="/" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-[#5D433C] bg-[#382722] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#D4C8BA] shadow-md transition hover:border-[#76513E] hover:text-[#FAF7F2]">
              <ArrowLeft size={15} /> Timeline
            </Link>
            {editMode ? (
              <div className="ml-auto flex min-w-0 flex-col items-end gap-1.5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="primary-button inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      {status === "Saving memory…" ? "Saving…" : status || "Saving…"}
                    </>
                  ) : (
                    <>
                      <Check size={13} /> Save changes
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => exitEditMode({ discard: true })}
                  disabled={saving}
                  className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#D4C8BA] transition hover:text-[#FAF7F2]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[#EBCDB5] transition hover:bg-[#382722] hover:text-white"
                >
                  <Trash2 size={13} /> Delete memory
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                aria-label="Edit memory"
                title="Edit memory"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#5D433C] bg-[#382722] text-[#D4C8BA] shadow-md transition hover:border-[#76513E] hover:text-[#FAF7F2]"
              >
                <Pencil size={16} />
              </button>
            )}
          </nav>

          <div className="mt-6 min-w-0">
            <div className="min-w-0 flex-1">
              {/* Title (UI label: "Date Title") */}
              {editMode ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Date Title"
                  className="memory-page-heading w-full border-b-2 border-[#5D433C] bg-transparent font-handwriting text-4xl font-bold tracking-tight text-[#FAF7F2] outline-none focus:border-[#76513E] sm:text-5xl placeholder:text-[#D4C8BA]/40"
                />
              ) : (
                <h1
                  className="scrapbook-text memory-page-heading memory-title-label break-words font-handwriting text-4xl font-bold tracking-tight text-[#FAF7F2] sm:text-5xl leading-tight"
                >
                  {title || "Untitled"}
                </h1>
              )}

              {/* Calendar date */}
              <div className="memory-page-date mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-handwriting text-xl text-[#D4C8BA]">
                {editMode ? (
                  <label className="inline-flex min-w-0 max-w-full items-center gap-2 font-sans text-sm text-[#D4C8BA]">
                      Date
                      <input
                        type="date"
                        value={dateStr}
                        onChange={(e) => setDateStr(e.target.value)}
                        className="min-w-0 rounded-xl border border-[#5D433C] bg-[#2D1E1A] px-2 py-1.5 font-semibold text-[#FAF7F2] outline-none focus:border-[#76513E]"
                      />
                  </label>
                ) : (
                  <span className="scrapbook-text">{formatDate(dateStr)}</span>
                )}
              </div>

              {/* Native color picker uses the existing color_tag field. */}
              {editMode && (
                <div className="mt-3 flex items-center gap-2 font-sans text-sm text-[#D4C8BA]">
                  <label htmlFor="memory-date-color" className="text-xs font-bold uppercase tracking-wider">
                    Date background
                  </label>
                  <input
                    id="memory-date-color"
                    type="color"
                    value={colorTag}
                    onChange={(e) => setColorTag(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-[#5D433C] bg-[#2D1E1A] p-1"
                  />
                  <span className="memory-color-value font-mono text-xs uppercase text-[#FAF7F2]">{colorTag}</span>
                </div>
              )}

            </div>
          </div>

          <MemorySong
              song={song}
              editMode={editMode}
              onChange={setSong}
              onMetadata={applySongMetadata}
            />

          {/* One uncropped photo at a time. */}
          <div className="mt-8 min-w-0">
            {photoUrlsForCarousel.length > 0 ? (
              <MemoryPhotoStack key={memory.id} photos={photoUrlsForCarousel} title={title} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#5D433C] py-14 text-center text-[#D4C8BA]">
                <ImageOff size={28} className="text-[#D4C8BA]/60" />
                <p className="font-handwriting text-2xl text-[#FAF7F2]">No photos added yet</p>
              </div>
            )}
            {/* Photo management in edit mode */}
            {editMode && (
              <div className="mt-4 border-t border-[#5D433C] pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#D4C8BA]">
                  Photos
                </p>

                {photoOrder.length > 0 && (
                  <DndContext
                    sensors={photoSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handlePhotoDragEnd}
                  >
                    <p className="mt-2 text-xs text-[#D4C8BA]">Drag the handles to reorder photos.</p>
                    <SortableContext items={photoOrder.map(photoSortId)} strategy={rectSortingStrategy}>
                      <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                        {photoOrder.map((target, i) => (
                          <SortablePhotoCard
                            key={photoSortId(target)}
                            target={target}
                            index={i}
                            src={coverSrcFor(target)}
                            current={isCover(target)}
                            count={photoOrder.length}
                            onRemove={() => target.kind === "existing" ? removeStoredPhoto(target.id) : removeNewFile(target.id)}
                            onMove={movePhoto}
                            onCover={() => openCoverCrop(target)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-[#5D433C] bg-[#2D1E1A] px-4 py-2.5 text-xs font-semibold text-[#D4C8BA] transition hover:border-[#76513E] hover:text-[#FAF7F2]">
                  <Upload size={15} />
                  Add photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={onFilesPicked}
                    className="sr-only"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Paper memories */}
          <section
            className="mt-10"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#5D433C] pb-4">
              <h2
                className="memory-page-heading min-w-0 flex-1 break-words font-handwriting text-3xl font-bold tracking-tight leading-tight text-[#FAF7F2]"
                style={{
                  textShadow: `0 0 24px ${colorConfig.hex}50, 0 2px 6px rgba(0, 0, 0, 0.5)`,
                }}
              >
                {title || "Untitled"}
              </h2>

              <div className="flex shrink-0 items-center gap-2">
                {!editMode && hasAnyMoment && (
                  <div
                    className="inline-flex rounded-full border border-[#5D433C] bg-[#2D1E1A] p-1"
                    role="group"
                    aria-label="Memory view"
                  >
                    <button
                      type="button"
                      onClick={() => setMomentsView("single")}
                      aria-label="One memory card at a time"
                      title="One at a time"
                      aria-pressed={momentsView === "single"}
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4EFE6] ${
                        momentsView === "single"
                          ? "bg-[#F4EFE6] text-[#382722]"
                          : "text-[#D4C8BA] hover:text-white"
                      }`}
                    >
                      <RectangleHorizontal size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMomentsView("all")}
                      aria-label="All memory cards"
                      title="All cards"
                      aria-pressed={momentsView === "all"}
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F4EFE6] ${
                        momentsView === "all"
                          ? "bg-[#F4EFE6] text-[#382722]"
                          : "text-[#D4C8BA] hover:text-white"
                      }`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="5" y="1" width="14" height="9" rx="2" />
                        <rect x="5" y="14" width="14" height="9" rx="2" />
                      </svg>
                    </button>
                  </div>
                )}

              </div>
            </div>

            {editMode ? (
              /* ---------------- MOMENTS EDITING ---------------- */
              <div className="mt-6 bg-[#382722]/70 p-4 shadow-xl sm:p-5">
                <p className="mb-4 text-xs text-[#D4C8BA]">Add, delete, and reorder memories</p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={moments.map((m) => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {moments.length === 0 ? (
                      <p className="text-sm text-[#D4C8BA]">
                        No moments yet. Add your first one below.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {moments.map((moment) => (
                          <SortableMomentRow
                            key={moment.id}
                            moment={moment}
                            onChange={updateMoment}
                            onRemove={removeMoment}
                            onPasteParagraphs={pasteMomentParagraphs}
                            accent={colorConfig.hex}
                          />
                        ))}
                      </ul>
                    )}
                  </SortableContext>
                </DndContext>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={addMoment}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#2D1E1A] border border-[#5D433C] px-4 py-2 text-xs font-semibold text-[#FAF7F2] transition hover:border-[#76513E]"
                  >
                    <Plus size={14} /> Add Moment
                  </button>
                </div>
              </div>
            ) : (
              /* ---------------- MOMENTS VIEWING ---------------- */
              hasAnyMoment ? momentsView === "single" ? (
                <div className="mt-6">
                  <div className="mx-auto max-w-xl">
                    {/* Native scroll only browses this date's moments. Each
                        paper occupies one track width, just like the photos. */}
                    <ul ref={momentTrackRef} className="snap-carousel moment-carousel" tabIndex={0}
                      aria-label="Swipe to browse this date's moments, or use the arrow keys"
                      onScroll={onMomentScroll} onKeyDown={onMomentKeyDown}>
                      {viewingMoments.map((moment, index) => <MomentPaper
                        key={moment.id} className="snap-slide" variant={index} moment={moment}
                        inactive={index !== displayedMomentIndex} revealed={momentIsRevealed(moment)}
                        onReveal={(reveal) => setNsfwReveal(moment.id, reveal)} />)}
                    </ul>
                    <p className="sr-only" aria-live="polite">Moment {displayedMomentIndex + 1} of {viewingMoments.length}</p>
                  </div>

                  <CarouselPagination count={viewingMoments.length} active={displayedMomentIndex}
                    onSelect={selectMoment} itemLabel="memory card" />
                </div>
              ) : (
                <ul className="moment-paper-list mt-8 space-y-7 px-1 sm:px-4">
                  {viewingMoments.map((moment, index) => (
                    <MomentPaper
                      key={moment.id}
                      variant={index}
                      moment={moment}
                      revealed={momentIsRevealed(moment)}
                      onReveal={(reveal) => setNsfwReveal(moment.id, reveal)}
                    />
                  ))}
                </ul>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-2 border-2 border-dashed border-[#5D433C] bg-[#382722]/60 py-10 text-center text-[#D4C8BA]">
                  <p className="font-handwriting text-2xl text-[#FAF7F2]">
                    No moments yet
                  </p>
                  <p className="text-sm">Use the page Edit button to add some.</p>
                </div>
              )
            )}
          </section>

          {error && (
            <p role="alert" className="mt-4 rounded-2xl border border-[#76513E] bg-[#2D1E1A] p-4 text-sm font-medium text-[#EBCDB5]">
              {error}
            </p>
          )}
        </div>
      </article>

      {/* Cover photo crop modal */}
      {coverCrop && coverSrcFor(coverCrop) && (
        <CoverCropModal
          src={coverSrcFor(coverCrop)}
          title={title}
          initialPos={isCover(coverCrop) ? coverPos : { x: 50, y: 50 }}
          initialZoom={isCover(coverCrop) ? coverZoom : 1}
          onConfirm={confirmCover}
          onCancel={() => setCoverCrop(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#5D433C] bg-[#352520] p-6 shadow-2xl sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#76513E]/20 text-[#EBCDB5] border border-[#76513E]/40">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-xl font-bold text-[#FAF7F2]">
              Delete this memory?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-[#D4C8BA]">
              Are you sure you want to delete &ldquo;{title || "this memory"}&rdquo;?
              This will permanently remove the timeline entry and delete all attached
              photos from storage. This cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#D4C8BA] transition hover:text-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteMemoryRow}
                disabled={deleting}
                className="primary-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Deleting…
                  </>
                ) : (
                  "Yes, delete memory"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
