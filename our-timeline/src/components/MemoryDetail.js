"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  GripVertical,
  ImageOff,
  Image as ImageIcon,
  Loader2,
  Music2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/dates";
import { playerEmbedUrl } from "@/lib/player";
import {
  getColorTagConfig,
  MEMORY_COLOR_TAGS,
  DEFAULT_COLOR_TAG,
  WARM_OLIVE_GREEN,
} from "@/lib/colors";
import { supabase, uploadPhoto, deleteMemoryPhotos } from "@/lib/supabase";
import { compressImage } from "@/lib/imageCompression";

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

// mm/dd/yy date for the carousel polaroid's top band, matching home timeline.
function polaroidTopDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

// Auto-growing multi-line textarea so moment text wraps while editing.
function MomentTextarea({ value, onChange, placeholder, isNsfw }) {
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
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-transparent text-sm outline-none ${
        isNsfw ? "text-[#DCE38E] font-medium" : "text-[#FAF7F2]"
      } placeholder:text-[#D4C8BA]/40`}
    />
  );
}

function SortableMomentRow({ moment, onChange, onRemove }) {
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
      className={`flex items-start gap-2.5 rounded-2xl border p-3.5 transition ${
        moment.is_nsfw
          ? "border-[#8F9648] bg-[#2E2818]"
          : "border-[#5D433C] bg-[#2D1E1A]"
      } ${isDragging ? "z-20 opacity-95 shadow-2xl scale-[1.01]" : ""}`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="mt-1 shrink-0 cursor-grab touch-none rounded-lg p-1 text-[#D4C8BA]/60 hover:text-[#FAF7F2] active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <MomentTextarea
        value={moment.text}
        onChange={(text) => onChange(moment.id, { text })}
        placeholder={moment.is_nsfw ? "Write an NSFW moment…" : "Write a moment…"}
        isNsfw={moment.is_nsfw}
      />

      {moment.is_nsfw && (
        <span
          className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border border-[#8F9648]"
          style={{ backgroundColor: WARM_OLIVE_GREEN.bgLight, color: WARM_OLIVE_GREEN.text }}
        >
          NSFW
        </span>
      )}

      <button
        type="button"
        onClick={() => onRemove(moment.id)}
        aria-label="Remove moment"
        className="shrink-0 rounded-lg p-1.5 text-[#D4C8BA]/60 transition hover:bg-[#382722] hover:text-[#F8B79D]"
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Cover photo crop modal — Solid Opaque Dialog
// ---------------------------------------------------------------------------
function CoverCropModal({ src, title, initialPos, onConfirm, onCancel }) {
  const [dragStart, setDragStart] = useState(null);
  const [lastPos, setLastPos] = useState(initialPos);

  function handlePointerDown(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({
      px: e.clientX,
      py: e.clientY,
      x: lastPos.x,
      y: lastPos.y,
      w: rect.width,
      h: rect.height,
    });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function handlePointerMove(e) {
    if (!dragStart) return;
    const dx = ((e.clientX - dragStart.px) / dragStart.w) * 100;
    const dy = ((e.clientY - dragStart.py) / dragStart.h) * 100;
    const nextX = Math.max(0, Math.min(100, dragStart.x + dx));
    const nextY = Math.max(0, Math.min(100, dragStart.y + dy));
    setLastPos({ x: nextX, y: nextY });
  }
  function handlePointerUp() {
    setDragStart(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-md rounded-3xl border border-[#5D433C] bg-[#352520] p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#FAF7F2]">Set as cover photo</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-full p-1.5 text-[#D4C8BA] transition hover:bg-[#261A16] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 text-xs text-[#D4C8BA]">
          Drag the photo to frame it precisely for the home timeline polaroid.
        </p>

        {/* Square framing preview window */}
        <div
          className="relative mt-4 aspect-square w-full select-none touch-none overflow-hidden rounded-2xl bg-[#261A16] border border-[#5D433C]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ cursor: dragStart ? "grabbing" : "grab" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={title || "Cover photo"}
            draggable={false}
            className="h-full w-full select-none"
            style={{
              objectFit: "cover",
              objectPosition: `${lastPos.x}% ${lastPos.y}%`,
            }}
          />
          {/* 5x5 subtle grid overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
              backgroundSize: "20% 20%",
            }}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-semibold text-[#D4C8BA] transition hover:text-[#FAF7F2]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(lastPos)}
            className="inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(200,90,50,0.4)] transition hover:bg-[#B34B24]"
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
  const [momentsEditMode, setMomentsEditMode] = useState(false);
  const [showNsfw, setShowNsfw] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // --- page-level edit fields -----------------------------------------------
  const [title, setTitle] = useState(memory.title ?? "");
  const [dateStr, setDateStr] = useState(memory.date ?? "");
  const [entryNumber, setEntryNumber] = useState(memory.entry_number ?? 1);
  const [colorTag, setColorTag] = useState(memory.color_tag ?? DEFAULT_COLOR_TAG);
  const [songUrl, setSongUrl] = useState(memory.song_url ?? "");
  const [photoUrls, setPhotoUrls] = useState(memory.photo_urls ?? []);
  const [newFiles, setNewFiles] = useState([]);

  const [cover, setCover] = useState(
    memory.cover_photo_url && (memory.photo_urls ?? []).includes(memory.cover_photo_url)
      ? { kind: "existing", id: memory.cover_photo_url }
      : null
  );
  const [coverPos, setCoverPos] = useState(
    memory.cover_photo_position && typeof memory.cover_photo_position === "object"
      ? {
          x: memory.cover_photo_position.x ?? 50,
          y: memory.cover_photo_position.y ?? 50,
        }
      : { x: 50, y: 50 }
  );
  const [coverCrop, setCoverCrop] = useState(null);

  // --- moments edit state ---------------------------------------------------
  const [moments, setMoments] = useState(() => normalizeMoments(memory.moments ?? []));

  // --- status flags ---------------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [savingMoments, setSavingMoments] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- photo carousel -------------------------------------------------------
  const carouselRef = useRef(null);

  const photoUrlsForCarousel = photoUrls;
  const embedUrl = playerEmbedUrl(songUrl);
  const colorConfig = getColorTagConfig(colorTag);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const newFileUrls = useMemo(
    () => newFiles.map((entry) => entry.objectUrl),
    [newFiles]
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
  const hasAnyMoment = moments.some((m) => m.text.trim() !== "");
  const hasNsfwMoment = moments.some((m) => m.is_nsfw && m.text.trim() !== "");

  const isStillEmptyDraft =
    isNewDraft &&
    (title || "").trim() === (memory.title || "").trim() &&
    dateStr === (memory.date ?? "") &&
    !hasAnyMoment &&
    photoUrls.length === 0 &&
    newFiles.length === 0 &&
    !cover &&
    (songUrl || "").trim() === (memory.song_url || "").trim();

  // --- photo carousel -------------------------------------------------------
  function carouselGoTo(index, behavior = "smooth") {
    const container = carouselRef.current;
    if (!container || container.children.length === 0) return;
    const clamped = Math.max(0, Math.min(index, container.children.length - 1));
    const child = container.children[clamped];
    const target =
      child.offsetLeft + child.offsetWidth / 2 - container.clientWidth / 2;
    container.scrollTo({ left: target, behavior });
    setActivePhotoIndex(clamped);
  }
  function carouselCenterIndex() {
    const container = carouselRef.current;
    if (!container || container.children.length === 0) return 0;
    const mid = container.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(container.children).forEach((child, i) => {
      const dist = Math.abs(
        child.offsetLeft + child.offsetWidth / 2 - container.scrollLeft - mid
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }
  function handleCarouselScroll() {
    const container = carouselRef.current;
    if (!container) return;
    setActivePhotoIndex(carouselCenterIndex());
  }
  function prevPhoto() {
    const container = carouselRef.current;
    if (!container || container.children.length === 0) return;
    const current = carouselCenterIndex();
    carouselGoTo((current + container.children.length - 1) % container.children.length);
  }
  function nextPhoto() {
    const container = carouselRef.current;
    if (!container || container.children.length === 0) return;
    const current = carouselCenterIndex();
    carouselGoTo((current + 1) % container.children.length);
  }

  // Center the first polaroid once layout is known (mount / photo list change).
  useEffect(() => {
    const container = carouselRef.current;
    if (!container || container.children.length === 0) return;
    setActivePhotoIndex(0);
    const child = container.children[0];
    container.scrollLeft =
      child.offsetLeft + child.offsetWidth / 2 - container.clientWidth / 2;
  }, [photoUrlsForCarousel.length]);

  // --- moments helpers ------------------------------------------------------
  function updateMoment(id, patch) {
    setMoments((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function removeMoment(id) {
    setMoments((prev) => prev.filter((m) => m.id !== id));
  }
  function addMoment(isNsfw) {
    const newMoment = {
      id: newMomentId(),
      text: "",
      is_nsfw: isNsfw,
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
  async function saveMoments() {
    setSavingMoments(true);
    setError(null);
    setStatus("");
    try {
      const clean = moments
        .filter((m) => m.text.trim() !== "")
        .map((m, i) => ({
          id: m.id,
          text: m.text.trim(),
          is_nsfw: m.is_nsfw,
          position: i,
        }));

      const { error: dbError } = await supabase
        .from("memories")
        .update({ moments: clean })
        .eq("id", memory.id);

      if (dbError) throw dbError;

      const { data, error: fetchErr } = await supabase
        .from("memories")
        .select("moments")
        .eq("id", memory.id)
        .single();
      if (fetchErr) throw fetchErr;

      setMoments(normalizeMoments(data?.moments ?? []));
      setMomentsEditMode(false);
      router.refresh();
    } catch (err) {
      console.error("Failed to save moments:", err);
      setError(err?.message || "Failed to save moments. Please try again.");
    } finally {
      setSavingMoments(false);
    }
  }

  // --- photo helpers --------------------------------------------------------
  function onFilesPicked(e) {
    const files = Array.from(e.target.files ?? []);
    setNewFiles((prev) => [
      ...prev,
      ...files.map((file) => {
        const objectUrl = URL.createObjectURL(file);
        pastObjectUrls.current.push(objectUrl);
        return { id: newMomentId(), file, objectUrl };
      }),
    ]);
    e.target.value = "";
  }
  function removeNewFile(id) {
    setNewFiles((prev) => {
      const removed = prev.find((entry) => entry.id === id);
      if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl);
      return prev.filter((entry) => entry.id !== id);
    });
    setCover((prev) => (prev && prev.kind === "new" && prev.id === id ? null : prev));
  }

  function isCover(target) {
    return !!cover && cover.kind === target.kind && cover.id === target.id;
  }
  function coverSrcFor(target) {
    if (!target) return null;
    if (target.kind === "existing") return target.id;
    const entry = newFiles.find((n) => n.id === target.id);
    return entry ? entry.objectUrl ?? null : null;
  }
  function openCoverCrop(target) {
    setCoverCrop(target);
  }
  function confirmCover(pos) {
    if (coverCrop) setCover(coverCrop);
    setCoverPos(pos);
    setCoverCrop(null);
  }

  // --- page-level save ------------------------------------------------------
  async function handleSave() {
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
          uploadedUrls.push(await uploadPhoto(file, String(entryNumber)));
        }
      }

      const finalPhotoUrls = [...photoUrls, ...uploadedUrls];

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
      const { error: dbError } = await supabase
        .from("memories")
        .update({
          title: title.trim() || "New Date",
          date: dateStr,
          entry_number: Number(entryNumber),
          color_tag: colorTag || DEFAULT_COLOR_TAG,
          song_url: songUrl.trim() || null,
          photo_urls: finalPhotoUrls.length > 0 ? finalPhotoUrls : null,
          cover_photo_url: finalCoverUrl || null,
          cover_photo_position: {
            x: Math.round(coverPos.x),
            y: Math.round(coverPos.y),
          },
        })
        .eq("id", memory.id);

      if (dbError) throw dbError;

      setPhotoUrls(finalPhotoUrls);
      setNewFiles([]);
      setEditMode(false);
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
      if (photoUrls.length > 0) {
        await deleteMemoryPhotos(photoUrls);
      }
      const { error: dbError } = await supabase
        .from("memories")
        .delete()
        .eq("id", memory.id);
      if (dbError) throw dbError;
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
      setEntryNumber(memory.entry_number ?? 1);
      setColorTag(memory.color_tag ?? DEFAULT_COLOR_TAG);
      setSongUrl(memory.song_url ?? "");
      setPhotoUrls(memory.photo_urls ?? []);
      setNewFiles([]);
      setCover(
        memory.cover_photo_url && (memory.photo_urls ?? []).includes(memory.cover_photo_url)
          ? { kind: "existing", id: memory.cover_photo_url }
          : null
      );
      setCoverPos(
        memory.cover_photo_position && typeof memory.cover_photo_position === "object"
          ? {
              x: memory.cover_photo_position.x ?? 50,
              y: memory.cover_photo_position.y ?? 50,
            }
          : { x: 50, y: 50 }
      );
      setMoments(normalizeMoments(memory.moments ?? []));
      setMomentsEditMode(false);
      setError(null);
    }
    setEditMode(false);
  }

  const visibleMoments = orderedMoments;

  return (
    <>
      <article className="relative mt-4">
        <div className="relative z-10">
          {/* Header metadata + Edit controls (top right) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="rounded-full px-3 py-1 font-mono text-xs font-bold shadow-xs border"
              style={{
                backgroundColor: colorConfig.bgLight,
                color: colorConfig.text,
                borderColor: colorConfig.border,
              }}
            >
              Date #{entryNumber}
            </span>

            {editMode ? (
              <div className="ml-auto flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#C85A32] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(200,90,50,0.4)] transition hover:bg-[#B34B24] disabled:opacity-60"
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
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[#F8B79D] transition hover:bg-[#382722] hover:text-white"
                >
                  <Trash2 size={13} /> Delete memory
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#5D433C] bg-[#382722] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#D4C8BA] shadow-md transition hover:border-[#C85A32] hover:text-[#FAF7F2]"
              >
                <Pencil size={13} />
                Edit
              </button>
            )}
          </div>

          {/* Title (UI label: "Date Title") */}
          {editMode ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Date Title"
              className="mt-3 w-full border-b-2 border-[#5D433C] bg-transparent font-handwriting text-4xl font-bold tracking-tight text-[#FAF7F2] outline-none focus:border-[#C85A32] sm:text-5xl placeholder:text-[#D4C8BA]/40"
            />
          ) : (
            <h1
              className="mt-3 font-handwriting text-4xl font-bold tracking-tight text-[#FAF7F2] sm:text-5xl leading-tight"
              style={{
                textShadow: `0 0 24px ${colorConfig.hex}50, 0 2px 6px rgba(0, 0, 0, 0.5)`,
              }}
            >
              {title || "Untitled"}
            </h1>
          )}

          {/* Date # and calendar date */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-handwriting text-xl text-[#D4C8BA]">
            {editMode ? (
              <>
                <label className="inline-flex items-center gap-2 font-sans text-sm text-[#D4C8BA]">
                  Date #
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={entryNumber}
                    onChange={(e) => setEntryNumber(e.target.value)}
                    className="w-20 rounded-xl border border-[#5D433C] bg-[#2D1E1A] px-3 py-1.5 font-semibold text-[#FAF7F2] outline-none focus:border-[#C85A32]"
                  />
                </label>
                <label className="inline-flex items-center gap-2 font-sans text-sm text-[#D4C8BA]">
                  Date
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="rounded-xl border border-[#5D433C] bg-[#2D1E1A] px-3 py-1.5 font-semibold text-[#FAF7F2] outline-none focus:border-[#C85A32]"
                  />
                </label>
              </>
            ) : (
              <span>{formatDate(dateStr)}</span>
            )}
          </div>

          {/* Color dropdown (only in page edit mode) */}
          {editMode && (
            <div className="mt-3 flex items-center gap-2 font-sans text-sm text-[#D4C8BA]">
              <span className="text-xs font-bold uppercase tracking-wider">Color</span>
              <select
                value={colorTag}
                onChange={(e) => setColorTag(e.target.value)}
                className="rounded-xl border border-[#5D433C] bg-[#2D1E1A] px-3 py-1.5 text-sm font-semibold text-[#FAF7F2] outline-none focus:border-[#C85A32]"
              >
                {MEMORY_COLOR_TAGS.map((c) => (
                  <option key={c.id} value={c.hex}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ---------------------------------------------------------------
              SONG EMBED — Solid Opaque Panel
              --------------------------------------------------------------- */}
          {(embedUrl || editMode) && (
            <div className="mt-8">
              {editMode ? (
                <div className="rounded-2xl border border-[#5D433C] bg-[#382722] p-4 shadow-xl">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D4C8BA]">
                    <Music2 size={14} style={{ color: colorConfig.hex }} />
                    Memory Song (Spotify / YouTube link)
                  </label>
                  <input
                    type="url"
                    value={songUrl}
                    onChange={(e) => setSongUrl(e.target.value)}
                    placeholder="https://open.spotify.com/track/…"
                    className="mt-2 w-full rounded-xl border border-[#5D433C] bg-[#2D1E1A] px-3.5 py-2 text-sm text-[#FAF7F2] outline-none placeholder:text-[#D4C8BA]/40 focus:border-[#C85A32]"
                  />
                  {embedUrl && (
                    <div className="mt-3 flex items-center gap-2">
                      <iframe
                        src={embedUrl}
                        title={`Song preview for ${title}`}
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        className="h-[84px] w-full rounded-xl border border-[#5D433C]"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-16 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: colorConfig.hex }}
                  />
                  <div className="flex-1 overflow-hidden rounded-2xl border border-[#5D433C] bg-[#382722] shadow-xl">
                    <iframe
                      src={embedUrl}
                      title={`Song for ${title}`}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="h-[84px] w-full sm:h-[92px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------
              PHOTO CAROUSEL — Solid Opaque Panel
              --------------------------------------------------------------- */}
          <div className="mt-8 rounded-3xl border border-[#5D433C] bg-[#382722] p-4 sm:p-6 shadow-2xl">
            {photoUrlsForCarousel.length > 0 ? (
              <div className="relative">
                <div className="relative">
                  <div
                    ref={carouselRef}
                    onScroll={handleCarouselScroll}
                    className="relative flex snap-x snap-mandatory items-center gap-4 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {photoUrlsForCarousel.map((url, i) => (
                      <div
                        key={url}
                        className="w-max max-w-full shrink-0 snap-center bg-[#FDFBF6] p-3 pb-5 shadow-[0_8px_30px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.2)]"
                      >
                        <div className="px-1.5 pb-2.5 pt-1 text-center font-mono text-sm font-semibold tracking-[0.18em] text-[#786F6A]">
                          {polaroidTopDate(dateStr)}
                        </div>
                        <div className="bg-[#EFE8DC]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`${title} — photo ${i + 1}`}
                            draggable={false}
                            loading={i === 0 ? "eager" : "lazy"}
                            onLoad={() => {
                              if (carouselCenterIndex() === i) carouselGoTo(i, "auto");
                            }}
                            className="block h-auto w-auto max-w-full select-none"
                            style={{ maxHeight: "calc(70vh - 8rem)" }}
                          />
                        </div>
                        <div
                          className="px-1.5 pt-3.5 text-center font-handwriting text-2xl font-bold leading-tight text-[#2C2523]"
                          style={{ fontFamily: "var(--font-handwriting)" }}
                        >
                          {title || "Untitled"}
                        </div>
                      </div>
                    ))}
                  </div>

                  {photoUrlsForCarousel.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevPhoto}
                        aria-label="Previous photo"
                        className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#261A16] text-white transition hover:bg-black active:scale-95 shadow-md border border-[#5D433C]"
                      >
                        <ChevronLeft size={22} />
                      </button>
                      <button
                        type="button"
                        onClick={nextPhoto}
                        aria-label="Next photo"
                        className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-[#261A16] text-white transition hover:bg-black active:scale-95 shadow-md border border-[#5D433C]"
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  )}
                </div>

                {photoUrlsForCarousel.length > 1 && (
                  <div className="mt-4 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[#D4C8BA]">
                      Photo {activePhotoIndex + 1} of {photoUrlsForCarousel.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {photoUrlsForCarousel.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => carouselGoTo(i)}
                          aria-label={`Go to photo ${i + 1}`}
                          className={`h-2 rounded-full transition-all ${
                            i === activePhotoIndex ? "w-6" : "w-2 bg-white/25 hover:bg-white/40"
                          }`}
                          style={{
                            backgroundColor: i === activePhotoIndex ? colorConfig.hex : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#5D433C] py-14 text-center text-[#D4C8BA]">
                <ImageOff size={28} className="text-[#D4C8BA]/60" />
                <p className="font-handwriting text-2xl text-[#FAF7F2]">
                  No photos added yet
                </p>
              </div>
            )}

            {/* Photo management in edit mode */}
            {editMode && (
              <div className="mt-4 border-t border-[#5D433C] pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#D4C8BA]">
                  Photos
                </p>

                {/* Stored photos grid */}
                {photoUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {photoUrls.map((url, i) => {
                      const target = { kind: "existing", id: url };
                      const current = isCover(target);
                      return (
                        <div
                          key={url}
                          className={`group relative rounded-2xl overflow-hidden bg-[#261A16] border transition ${
                            current
                              ? "border-2 border-[#C85A32]"
                              : "border-[#5D433C]"
                          }`}
                        >
                          <div className="relative aspect-square">
                            <Image
                              src={url}
                              alt={`Photo ${i + 1}`}
                              fill
                              sizes="25vw"
                              className="object-cover"
                              unoptimized
                            />
                            {current && (
                              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#C85A32] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                                <ImageIcon size={10} /> Cover
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setPhotoUrls((prev) => prev.filter((u) => u !== url))}
                              aria-label="Remove photo"
                              className="absolute right-2 top-2 rounded-full bg-[#261A16]/90 p-1.5 text-white transition hover:bg-[#C85A32]"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => openCoverCrop(target)}
                            className={`w-full border-t px-2 py-2 text-center text-[11px] font-semibold transition ${
                              current
                                ? "border-[#C85A32]/50 bg-[#C85A32]/20 text-[#F8B79D]"
                                : "border-[#5D433C] bg-[#2D1E1A] text-[#D4C8BA] hover:bg-[#382722] hover:text-white"
                            }`}
                          >
                            {current ? "Edit cover position" : "Set as cover photo"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Newly picked files grid */}
                {newFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {newFiles.map((entry, i) => {
                      const target = { kind: "new", id: entry.id };
                      const current = isCover(target);
                      return (
                        <div
                          key={entry.id}
                          className={`group relative rounded-2xl overflow-hidden bg-[#261A16] border transition ${
                            current
                              ? "border-2 border-[#C85A32]"
                              : "border-[#5D433C]"
                          }`}
                        >
                          <div className="relative aspect-square">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={newFileUrls[i]}
                              alt={`New photo ${i + 1}`}
                              className="h-full w-full object-cover"
                            />
                            {current && (
                              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#C85A32] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                                <ImageIcon size={10} /> Cover
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => removeNewFile(entry.id)}
                              aria-label="Remove photo"
                              className="absolute right-2 top-2 rounded-full bg-[#261A16]/90 p-1.5 text-white transition hover:bg-[#C85A32]"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => openCoverCrop(target)}
                            className={`w-full border-t px-2 py-2 text-center text-[11px] font-semibold transition ${
                              current
                                ? "border-[#C85A32]/50 bg-[#C85A32]/20 text-[#F8B79D]"
                                : "border-[#5D433C] bg-[#2D1E1A] text-[#D4C8BA] hover:bg-[#382722] hover:text-white"
                            }`}
                          >
                            {current ? "Edit cover position" : "Set as cover photo"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-[#5D433C] bg-[#2D1E1A] px-4 py-2.5 text-xs font-semibold text-[#D4C8BA] transition hover:border-[#C85A32] hover:text-[#FAF7F2]">
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

          {/* ---------------------------------------------------------------
              MOMENTS LIST — Solid Opaque Panel
              --------------------------------------------------------------- */}
          <section className="mt-8 rounded-3xl border border-[#5D433C] bg-[#382722] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-[#5D433C] pb-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D4C8BA]">
                <Flame size={14} style={{ color: colorConfig.hex }} />
                Moments
              </h2>

              <div className="flex items-center gap-2">
                {/* NSFW view toggle */}
                {hasNsfwMoment && !momentsEditMode && (
                  <button
                    type="button"
                    onClick={() => setShowNsfw((v) => !v)}
                    aria-pressed={showNsfw}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
                    style={{
                      backgroundColor: showNsfw ? WARM_OLIVE_GREEN.bgLight : "#2D1E1A",
                      borderColor: showNsfw ? WARM_OLIVE_GREEN.border : "#5D433C",
                      color: showNsfw ? WARM_OLIVE_GREEN.text : "#D4C8BA",
                    }}
                  >
                    <Flame size={13} style={{ color: WARM_OLIVE_GREEN.hex }} />
                    {showNsfw ? "Hide NSFW" : "Show NSFW"}
                  </button>
                )}

                {/* Edit moments toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (momentsEditMode) {
                      setMoments(normalizeMoments(memory.moments ?? []));
                    }
                    setMomentsEditMode((v) => !v);
                  }}
                  aria-pressed={momentsEditMode}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                    momentsEditMode
                      ? "border-[#C85A32] bg-[#48281E] text-[#F8B79D]"
                      : "border-[#5D433C] bg-[#2D1E1A] text-[#D4C8BA] hover:border-[#C85A32] hover:text-[#FAF7F2]"
                  }`}
                >
                  <GripVertical size={13} />
                  {momentsEditMode ? "Done" : "Edit Moments"}
                </button>
              </div>
            </div>

            {momentsEditMode ? (
              /* ---------------- MOMENTS EDITING ---------------- */
              <div className="mt-5">
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
                          />
                        ))}
                      </ul>
                    )}
                  </SortableContext>
                </DndContext>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addMoment(false)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#2D1E1A] border border-[#5D433C] px-4 py-2 text-xs font-semibold text-[#FAF7F2] transition hover:border-[#C85A32]"
                  >
                    <Plus size={14} /> Add Moment
                  </button>
                  <button
                    type="button"
                    onClick={() => addMoment(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#8F9648] px-4 py-2 text-xs font-semibold transition hover:bg-[#3E341C]"
                    style={{
                      backgroundColor: WARM_OLIVE_GREEN.bgLight,
                      color: WARM_OLIVE_GREEN.text,
                    }}
                  >
                    <Flame size={14} style={{ color: WARM_OLIVE_GREEN.hex }} /> Add NSFW Moment
                  </button>

                  <button
                    type="button"
                    onClick={saveMoments}
                    disabled={savingMoments}
                    className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_4px_16px_rgba(200,90,50,0.4)] transition hover:bg-[#B34B24] disabled:opacity-60"
                  >
                    {savingMoments ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Saving…
                      </>
                    ) : (
                      <>
                        <Check size={14} /> Save Moments
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* ---------------- MOMENTS VIEWING ---------------- */
              hasAnyMoment ? (
                <ul className="mt-5 space-y-3.5">
                  {visibleMoments.map((moment) => {
                    const revealed = !moment.is_nsfw || showNsfw;
                    return (
                      <li
                        key={moment.id}
                        className={`flex items-start gap-3 text-sm sm:text-base leading-relaxed ${
                          moment.is_nsfw ? "italic" : ""
                        }`}
                        style={{
                          color: moment.is_nsfw ? WARM_OLIVE_GREEN.text : "#FAF7F2",
                        }}
                      >
                        {/* Dot indicator: Olive green for NSFW, entry's color_tag for standard moments */}
                        <span
                          aria-hidden="true"
                          className="mt-2 h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: moment.is_nsfw ? WARM_OLIVE_GREEN.hex : colorConfig.hex,
                            boxShadow: moment.is_nsfw
                              ? `0 0 10px ${WARM_OLIVE_GREEN.hex}`
                              : `0 0 10px ${colorConfig.hex}`,
                          }}
                        />
                        {moment.is_nsfw ? (
                          revealed ? (
                            <span>{moment.text}</span>
                          ) : (
                            <span
                              className="font-sans text-xs font-bold uppercase tracking-wide not-italic px-1.5 py-0.5 rounded-sm"
                              style={{
                                backgroundColor: WARM_OLIVE_GREEN.bgLight,
                                color: WARM_OLIVE_GREEN.text,
                                border: `1px solid ${WARM_OLIVE_GREEN.border}`,
                              }}
                            >
                              [NSFW]
                            </span>
                          )
                        ) : (
                          <span>{moment.text}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#5D433C] py-10 text-center text-[#D4C8BA]">
                  <p className="font-handwriting text-2xl text-[#FAF7F2]">
                    No moments yet
                  </p>
                  <p className="text-sm">Tap “Edit Moments” to add some.</p>
                </div>
              )
            )}
          </section>

          {error && (
            <p role="alert" className="mt-4 rounded-2xl border border-[#C85A32] bg-[#2D1E1A] p-4 text-sm font-medium text-[#F8B79D]">
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
          initialPos={coverPos}
          onConfirm={confirmCover}
          onCancel={() => setCoverCrop(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#5D433C] bg-[#352520] p-6 shadow-2xl sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C85A32]/20 text-[#F8B79D] border border-[#C85A32]/40">
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
                className="inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(200,90,50,0.4)] transition hover:bg-[#B34B24] disabled:opacity-60"
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
