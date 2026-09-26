"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Flame,
  GripVertical,
  ImageOff,
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
import {
  getColorTagConfig,
  memoryColorHex,
  DEFAULT_COLOR_TAG,
  WARM_OLIVE_GREEN,
} from "@/lib/colors";
import { supabase, uploadPhoto, deleteMemoryPhotos } from "@/lib/supabase";
import { compressImage } from "@/lib/imageCompression";
import { memoryPhotoTransitionName } from "@/lib/viewTransitions";

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
      className={`w-full resize-none overflow-hidden bg-transparent text-sm leading-6 outline-none ${
        isNsfw ? "font-medium text-[#52591D]" : "text-[#332923]"
      } placeholder:text-[#806F5B]/55`}
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
      className={`flex items-start gap-2.5 border p-3.5 text-[#332923] shadow-[0_8px_20px_rgba(0,0,0,0.22)] transition ${
        moment.is_nsfw
          ? "border-[#8F9648]/70 bg-[#F4EDCF]"
          : "border-[#B7A98D] bg-[#FBF3DF]"
      } ${isDragging ? "z-20 opacity-95 shadow-2xl scale-[1.01]" : ""}`}
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
        className="shrink-0 rounded-lg p-1.5 text-[#806F5B] transition hover:bg-black/5 hover:text-[#A44228]"
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}

function MomentPaper({
  moment,
  revealed,
  onReveal,
  className = "",
}) {
  const isNsfw = moment.is_nsfw;

  return (
    <li
      className={`moment-paper moment-paper--taped ${isNsfw ? "moment-paper--nsfw" : ""} ${className}`}
    >
      <div className="flex min-h-[9rem] items-center justify-center px-6 py-7 text-center sm:min-h-[10rem] sm:px-9 sm:py-8">
        {isNsfw ? (
          <div className="flex min-w-0 w-full flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-2">
              <span
                className="shrink-0 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{
                  backgroundColor: "#E8E9C5",
                  color: "#414A16",
                  borderColor: WARM_OLIVE_GREEN.border,
                }}
              >
                NSFW
              </span>
              <button
                type="button"
                onClick={() => onReveal(!revealed)}
                aria-label={revealed ? "Hide this NSFW moment" : "Reveal this NSFW moment"}
                className="inline-flex h-7 items-center gap-1.5 border border-[#A4A85E] bg-[#F8F2CF] px-2.5 text-[11px] font-semibold text-[#59601F] transition hover:bg-[#EEE6B6]"
              >
                {revealed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {revealed ? "Hide" : "Reveal"}
              </button>
            </div>
            {revealed ? (
              <p className="min-w-0 max-w-prose whitespace-pre-wrap break-words text-[0.95rem] leading-7 text-[#332923] sm:text-base">
                {moment.text}
              </p>
            ) : (
              <p className="text-sm leading-6 text-[#70664D]">
                A private memory is folded inside.
              </p>
            )}
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
  const [momentsView, setMomentsView] = useState("single");
  const [activeMomentIndex, setActiveMomentIndex] = useState(0);
  const [forceShownIds, setForceShownIds] = useState(() => new Set());
  const [forceHiddenIds, setForceHiddenIds] = useState(() => new Set());
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // --- page-level edit fields -----------------------------------------------
  const [title, setTitle] = useState(memory.title ?? "");
  const [dateStr, setDateStr] = useState(memory.date ?? "");
  const [entryNumber, setEntryNumber] = useState(memory.entry_number ?? 1);
  const [colorTag, setColorTag] = useState(memoryColorHex(memory.color_tag));
  const [song, setSong] = useState({
    url: memory.song_url ?? "",
    title: memory.song_title ?? null,
    artist: memory.song_artist ?? null,
    coverUrl: memory.song_cover_url ?? null,
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
  const transitionPhotoUrl = (memory.photo_urls ?? []).includes(memory.cover_photo_url)
    ? memory.cover_photo_url
    : (memory.photo_urls ?? [])[0];
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
  const viewingMoments = useMemo(
    () => orderedMoments.filter((moment) => moment.text.trim() !== ""),
    [orderedMoments]
  );
  const displayedMomentIndex = Math.min(
    activeMomentIndex,
    Math.max(0, viewingMoments.length - 1)
  );
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
          song_url: youtubeSongUrl(songUrl) || songUrl.trim() || null,
          song_title: songUrl.trim() ? song.title?.trim() || null : null,
          song_artist: songUrl.trim() ? song.artist?.trim() || null : null,
          song_cover_url: songUrl.trim() ? song.coverUrl || (youtubeVideoId(songUrl) ? youtubeCoverUrls(youtubeVideoId(songUrl))[0] : null) : null,
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
      setColorTag(memoryColorHex(memory.color_tag));
      setSong({
        url: memory.song_url ?? "",
        title: memory.song_title ?? null,
        artist: memory.song_artist ?? null,
        coverUrl: memory.song_cover_url ?? null,
      });
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

  function momentIsRevealed(moment) {
    return (
      !moment.is_nsfw ||
      (forceShownIds.has(moment.id) && !forceHiddenIds.has(moment.id))
    );
  }

  function previousMoment() {
    setActiveMomentIndex((current) => Math.max(0, current - 1));
  }

  function nextMoment() {
    setActiveMomentIndex((current) => Math.min(viewingMoments.length - 1, current + 1));
  }

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

          <div className="mt-3 flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              {/* Title (UI label: "Date Title") */}
              {editMode ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Date Title"
                  className="memory-page-heading mt-3 w-full border-b-2 border-[#5D433C] bg-transparent font-handwriting text-4xl font-bold tracking-tight text-[#FAF7F2] outline-none focus:border-[#C85A32] sm:text-5xl placeholder:text-[#D4C8BA]/40"
                />
              ) : (
                <h1
                  className="memory-page-heading mt-3 break-words font-handwriting text-4xl font-bold tracking-tight text-[#FAF7F2] sm:text-5xl leading-tight"
                  style={{
                    textShadow: `0 0 24px ${colorConfig.hex}50, 0 2px 6px rgba(0, 0, 0, 0.5)`,
                  }}
                >
                  {title || "Untitled"}
                </h1>
              )}

              {/* Date # and calendar date */}
              <div className="memory-page-date mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-handwriting text-xl text-[#D4C8BA]">
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
            <MemorySong
              song={song}
              editMode={editMode}
              onChange={setSong}
              onMetadata={applySongMetadata}
              accent={colorConfig.hex}
            />
          </div>

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
                        style={
                          i === photoUrlsForCarousel.indexOf(transitionPhotoUrl)
                            ? { viewTransitionName: memoryPhotoTransitionName(memory.id) }
                            : undefined
                        }
                      >
                        <div className="px-1.5 pb-2.5 pt-1 text-center font-mono text-sm font-semibold tracking-[0.18em] text-[#786F6A]">
                          <span aria-hidden="true">&nbsp;</span>
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
                          <span aria-hidden="true">&nbsp;</span>
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

          {/* Paper memories */}
          <section
            className="mt-10"
            onKeyDown={(event) => {
              if (momentsEditMode || momentsView !== "single" || !hasAnyMoment) return;
              if (event.key === "ArrowLeft") previousMoment();
              if (event.key === "ArrowRight") nextMoment();
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#5D433C] pb-4">
              <h2
                className="memory-page-heading font-handwriting text-3xl font-bold tracking-tight leading-tight text-[#FAF7F2]"
                style={{
                  textShadow: `0 0 24px ${colorConfig.hex}50, 0 2px 6px rgba(0, 0, 0, 0.5)`,
                }}
              >
                {title || "Untitled"}
              </h2>

              <div className="flex shrink-0 items-center gap-2">
                {!momentsEditMode && hasAnyMoment && (
                  <div
                    className="mr-1 inline-flex rounded-full border border-[#5D433C] bg-[#2D1E1A] p-1"
                    aria-label="Memory view"
                  >
                    <button
                      type="button"
                      onClick={() => setMomentsView("single")}
                      aria-pressed={momentsView === "single"}
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                        momentsView === "single"
                          ? "bg-[#F4EFE6] text-[#382722]"
                          : "text-[#D4C8BA] hover:text-white"
                      }`}
                    >
                      One at a time
                    </button>
                    <button
                      type="button"
                      onClick={() => setMomentsView("all")}
                      aria-pressed={momentsView === "all"}
                      className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                        momentsView === "all"
                          ? "bg-[#F4EFE6] text-[#382722]"
                          : "text-[#D4C8BA] hover:text-white"
                      }`}
                    >
                      All
                    </button>
                  </div>
                )}
                {/* Edit moments toggle — just a pencil */}
                <button
                  type="button"
                  onClick={() => {
                    if (momentsEditMode) {
                      setMoments(normalizeMoments(memory.moments ?? []));
                    }
                    setMomentsEditMode((v) => !v);
                  }}
                  aria-pressed={momentsEditMode}
                  aria-label={momentsEditMode ? "Finish editing moments" : "Edit moments"}
                  className="flex h-9 w-9 items-center justify-center rounded-full border transition"
                  style={{
                    backgroundColor: momentsEditMode ? colorConfig.bgLight : "#2D1E1A",
                    borderColor: momentsEditMode ? colorConfig.border : "#5D433C",
                    color: momentsEditMode ? colorConfig.text : "#D4C8BA",
                  }}
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>

            {momentsEditMode ? (
              /* ---------------- MOMENTS EDITING ---------------- */
              <div className="mt-6 bg-[#382722]/70 p-4 shadow-xl sm:p-5">
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
              hasAnyMoment ? momentsView === "single" ? (
                <div className="mt-6">
                  <div className="mx-auto max-w-xl">
                    <ul aria-live="polite">
                      <MomentPaper
                        key={viewingMoments[displayedMomentIndex].id}
                        moment={viewingMoments[displayedMomentIndex]}
                        revealed={momentIsRevealed(viewingMoments[displayedMomentIndex])}
                        onReveal={(reveal) =>
                          setNsfwReveal(viewingMoments[displayedMomentIndex].id, reveal)
                        }
                      />
                    </ul>
                  </div>

                  {viewingMoments.length > 1 && (
                    <div className="mt-3 flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={previousMoment}
                        disabled={displayedMomentIndex === 0}
                        aria-label="Previous memory"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#5D433C] bg-[#2D1E1A] text-[#FAF7F2] transition hover:border-[#C85A32] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={nextMoment}
                        disabled={displayedMomentIndex === viewingMoments.length - 1}
                        aria-label="Next memory"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#5D433C] bg-[#2D1E1A] text-[#FAF7F2] transition hover:border-[#C85A32] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="moment-paper-list mt-8 space-y-7 px-1 sm:px-4">
                  {viewingMoments.map((moment) => (
                    <MomentPaper
                      key={moment.id}
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
                  <p className="text-sm">Tap the pencil to add some.</p>
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
