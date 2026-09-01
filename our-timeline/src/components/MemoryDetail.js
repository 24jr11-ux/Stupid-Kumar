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
import { getColorTagConfig, MEMORY_COLOR_TAGS, DEFAULT_COLOR_TAG } from "@/lib/colors";
import { supabase, uploadPhoto, deleteMemoryPhotos } from "@/lib/supabase";
import { compressImage } from "@/lib/imageCompression";

// ---------------------------------------------------------------------------
// Moments data structure
// ---------------------------------------------------------------------------
// Each memory's content lives in `memory.moments`, a jsonb array of objects:
//   { id: string(uuid), text: string, is_nsfw: boolean, position: number }
// `id` is a client-generated uuid used as the React key and the drag-and-drop
// id. `position` is the sort order; it is recomputed whenever the list is
// reordered and persisted back to the memories row on save.
// ---------------------------------------------------------------------------

function newMomentId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Initialize a draft moments array with positions derived from array index.
function normalizeMoments(moments = []) {
  return moments.map((m, i) => ({
    id: m?.id || newMomentId(),
    text: m?.text ?? "",
    is_nsfw: !!m?.is_nsfw,
    position: typeof m?.position === "number" ? m.position : i,
  }));
}

function SortableMomentRow({ moment, onChange, onRemove, editing }) {
  // `useSortable` provides the drag handle behavior for this row.
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
      className={`flex items-start gap-2 rounded-2xl border p-3 ${
        moment.is_nsfw
          ? "border-[#F9DCD0] bg-[#FDF2EC]"
          : "border-[#E8E2D9] bg-[#FAF7F2]"
      } ${isDragging ? "z-10 opacity-90 shadow-lg" : ""}`}
    >
      {/* Drag handle — only draggable while moments editing is active */}
      <button
        type="button"
        className="mt-1 shrink-0 cursor-grab touch-none rounded-lg p-1 text-[#B8ADA1] hover:text-[#786F6A] active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} />
      </button>

      <input
        type="text"
        value={moment.text}
        onChange={(e) => onChange(moment.id, { text: e.target.value })}
        placeholder={moment.is_nsfw ? "Write an NSFW moment…" : "Write a moment…"}
        className={`w-full bg-transparent text-sm outline-none ${
          moment.is_nsfw ? "text-[#933B19]" : "text-[#2C2523]"
        } placeholder:text-[#A89F95]`}
      />

      {moment.is_nsfw && (
        <span
          className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: "#F9DCD0", color: "#933B19" }}
        >
          NSFW
        </span>
      )}

      <button
        type="button"
        onClick={() => onRemove(moment.id)}
        aria-label="Remove moment"
        className="shrink-0 rounded-lg p-1.5 text-[#B8ADA1] transition hover:bg-[#FDF0EA] hover:text-[#C85A32]"
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Cover photo crop modal
// ---------------------------------------------------------------------------
// Shows a square window over the selected photo. The photo is draggable so the
// user can position it precisely the way it'll appear on the polaroid. The
// resulting (x, y) is a 0-100 percentage that becomes `object-position`.
// ---------------------------------------------------------------------------
function CoverCropModal({ src, title, initialPos, onConfirm, onCancel }) {
  const [dragStart, setDragStart] = useState(null);
  const [lastPos, setLastPos] = useState(initialPos);

  // Drag repositions the photo. The image is rendered with the exact same
  // object-cover + object-position the polaroid uses, so the on-screen framing
  // is a pixel-perfect preview of the final polaroid thumb on the timeline.
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
    const dx = (e.clientX - dragStart.px) / dragStart.w * 100;
    const dy = (e.clientY - dragStart.py) / dragStart.h * 100;
    const nextX = Math.max(0, Math.min(100, dragStart.x + dx));
    const nextY = Math.max(0, Math.min(100, dragStart.y + dy));
    setLastPos({ x: nextX, y: nextY });
  }
  function handlePointerUp() {
    setDragStart(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C2523]/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-[#2C2523]">Set as cover photo</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-full p-1.5 text-[#B8ADA1] transition hover:bg-[#FDF0EA] hover:text-[#C85A32]"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-1 text-xs text-[#8C827A]">
          Drag the photo to frame it the way you want it on the polaroid.
        </p>

        {/* Square framing window. The image uses the same object-cover +
            object-position as the polaroid, so dragging = live preview. */}
        <div
          className="relative mt-4 aspect-square w-full select-none touch-none overflow-hidden rounded-2xl bg-[#EFE8DC]"
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
          {/* 5x5 square grid overlay to show the proportional layout */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: "20% 20%",
            }}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#786F6A] transition hover:text-[#2C2523]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(lastPos)}
            className="inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B34B24]"
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

  // --- page-level edit fields (independent local drafts) -------------------
  const [title, setTitle] = useState(memory.title ?? "");
  const [dateStr, setDateStr] = useState(memory.date ?? "");
  const [entryNumber, setEntryNumber] = useState(memory.entry_number ?? 1);
  const [colorTag, setColorTag] = useState(memory.color_tag ?? DEFAULT_COLOR_TAG);
  const [songUrl, setSongUrl] = useState(memory.song_url ?? "");
  const [photoUrls, setPhotoUrls] = useState(memory.photo_urls ?? []);
  const [newFiles, setNewFiles] = useState([]);
  // Newly picked files are wrapped so each has a stable local id (used as the
  // React key and to track which one is the future cover before its upload URL
  // exists).
  // Cover photo: we track WHICH photo is the polaroid cover plus where it's
  // positioned. `cover` is { kind: "existing"|"new", id } — for an existing
  // photo id is its URL, for a new file id is the file's local id.
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
  // Which photo we're framing in the crop modal. { kind, id } or null when closed.
  const [coverCrop, setCoverCrop] = useState(null);

  // --- moments edit state ---------------------------------------------------
  // Kept entirely separate from the page-level fields above so the two edit
  // toggles can be used independently and save independently.
  const [moments, setMoments] = useState(() => normalizeMoments(memory.moments ?? []));

  // --- status flags ---------------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [savingMoments, setSavingMoments] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // --- touch swipe ----------------------------------------------------------
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const photoUrlsForCarousel = photoUrls;
  const embedUrl = playerEmbedUrl(songUrl);
  const colorConfig = getColorTagConfig(colorTag);

  // dnd-kit sensors — pointer + keyboard support for accessibility.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // --- object URLs for new-file previews ------------------------------------
  // newFiles is [{ id, file, objectUrl }]. Each entry carries its own preview
  // URL (created at pick time) so it can be shared by the grid + crop modal
  // without touching a ref during render.
  const newFileUrls = useMemo(
    () => newFiles.map((entry) => entry.objectUrl),
    [newFiles]
  );
  const pastObjectUrls = useRef([]);
  useEffect(() => {
    // Revoke object URLs once the component unmounts.
    const urls = pastObjectUrls.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // --- metadata -------------------------------------------------------------
  const orderedMoments = useMemo(
    () => [...moments].sort((a, b) => a.position - b.position),
    [moments]
  );
  const hasAnyMoment = moments.some((m) => m.text.trim() !== "");
  const hasNsfwMoment = moments.some((m) => m.is_nsfw && m.text.trim() !== "");

  // True when this is a freshly-created, still-unchanged draft. Used to decide
  // whether exiting edit mode should delete the empty row (see Part 3).
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
  function prevPhoto() {
    setActivePhotoIndex((prev) =>
      prev === 0 ? photoUrlsForCarousel.length - 1 : prev - 1
    );
  }
  function nextPhoto() {
    setActivePhotoIndex((prev) =>
      prev === photoUrlsForCarousel.length - 1 ? 0 : prev + 1
    );
  }
  function handleTouchStart(e) {
    touchStartX.current = e.targetTouches[0].clientX;
  }
  function handleTouchMove(e) {
    touchEndX.current = e.targetTouches[0].clientX;
  }
  function handleTouchEnd() {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 45) nextPhoto();
    else if (distance < -45) prevPhoto();
    touchStartX.current = null;
    touchEndX.current = null;
  }

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
      // Reorder then re-index `position` to match array order.
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
      // Only persist moments that have text (ignore blank draft rows).
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

      // Refresh the row's moments so the bulleted view reflects changes.
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
    // If the removed file was the picked cover, clear it.
    setCover((prev) => (prev && prev.kind === "new" && prev.id === id ? null : prev));
  }

  // --- cover photo helpers ---------------------------------------------------
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
      // 1. Compress + upload any newly picked photos.
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

      // Resolve the picked cover to a concrete URL now that uploads are done:
      // "existing" -> its URL must still be in the final list; "new" -> the
      // uploaded URL at the new file's index. Fall back to the first photo.
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

  // --- delete this memory ---------------------------------------------------
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

  // --- exiting page edit mode ----------------------------------------------
  // Centralized so both the Save path, Cancel, and the pencil toggle behave
  // consistently. If this is a freshly created empty draft, leaving edit mode
  // without adding anything deletes the empty row (Part 3).
  function exitEditMode({ discard = false } = {}) {
    if (isStillEmptyDraft) {
      deleteMemoryRow();
      return;
    }
    if (discard) {
      // Throw away unsaved page-level edits and moments edits.
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

  // View-mode bulleted moments list (this is the full content of the date).
  // All moments are always shown in order; NSFW moments just render as a
  // "[NSFW]" bullet until the toggle flips `showNsfw` to reveal their text.
  const visibleMoments = orderedMoments;

  return (
    <>
      <article className="relative mt-4">
        {/* Soft gradient wash behind the header */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -left-12 -right-12 h-96 rounded-b-[60px] opacity-40 blur-3xl"
          style={{
            background: `radial-gradient(ellipse at 50% 20%, ${colorConfig.hex} 0%, ${colorConfig.bgLight} 70%, transparent 100%)`,
          }}
        />

        <div className="relative">
          {/* Header metadata + the edit controls (top right) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="rounded-full px-3 py-1 font-mono text-xs font-bold shadow-2xs"
              style={{
                backgroundColor: colorConfig.bgLight,
                color: colorConfig.text,
                border: `1px solid ${colorConfig.border}`,
              }}
            >
              {/* UI label: entry_number displays as "Date #" */}
              Date #{memory.entry_number}
            </span>

            {editMode ? (
              /* In edit mode the top-right holds the save/cancel/delete
                 actions stacked vertically — no separate "Done" toggle. */
              <div className="ml-auto flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#C85A32] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#B34B24] disabled:opacity-60"
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
                  className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#786F6A] transition hover:text-[#2C2523]"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-[#A85858] transition hover:bg-[#FDF2EC] hover:text-[#C85A32]"
                >
                  <Trash2 size={13} /> Delete memory
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#E8E2D9] bg-[#FFFDF9] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#786F6A] transition hover:border-[#D8CEBF] hover:text-[#2C2523]"
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
              className="mt-3 w-full border-b-2 border-[#DCD3C7] bg-transparent font-handwriting text-4xl font-bold tracking-tight text-[#2C2523] outline-none focus:border-[#C85A32] sm:text-5xl"
            />
          ) : (
            <h1 className="mt-3 font-handwriting text-4xl font-bold tracking-tight text-[#2C2523] sm:text-5xl leading-tight">
              {title || "Untitled"}
            </h1>
          )}

          {/* Date # and calendar date (editable inline) */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-handwriting text-xl text-[#786F6A]">
            {editMode ? (
              <>
                <label className="inline-flex items-center gap-2 font-sans text-sm text-[#8C827A]">
                  Date #
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={entryNumber}
                    onChange={(e) => setEntryNumber(e.target.value)}
                    className="w-20 rounded-xl border border-[#DCD3C7] bg-[#FFFDF9] px-3 py-1.5 font-semibold text-[#2C2523] outline-none focus:border-[#C85A32]"
                  />
                </label>
                <label className="inline-flex items-center gap-2 font-sans text-sm text-[#8C827A]">
                  Date
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="rounded-xl border border-[#DCD3C7] bg-[#FFFDF9] px-3 py-1.5 font-semibold text-[#2C2523] outline-none focus:border-[#C85A32]"
                  />
                </label>
              </>
            ) : (
              <span>{formatDate(dateStr)}</span>
            )}
          </div>

          {/* Color dropdown (only in page edit mode — select, not free picker) */}
          {editMode && (
            <div className="mt-3 flex items-center gap-2 font-sans text-sm text-[#8C827A]">
              <span className="text-xs font-bold uppercase tracking-wider">Color</span>
              <select
                value={colorTag}
                onChange={(e) => setColorTag(e.target.value)}
                className="rounded-xl border border-[#DCD3C7] bg-[#FFFDF9] px-3 py-1.5 text-sm font-semibold text-[#2C2523] outline-none focus:border-[#C85A32]"
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
              SONG EMBED — moved to the TOP of the page, shrunk to a compact
              card (~84px tall). If no song_url is set we skip the section in
              view mode; in edit mode we show a compact input with a live
              preview that updates as you type.
              --------------------------------------------------------------- */}
          {(embedUrl || editMode) && (
            <div className="mt-8">
              {editMode ? (
                <div className="rounded-2xl border border-[#E8E2D9] bg-[#FFFDF9] p-3 shadow-sm">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#786F6A]">
                    <Music2 size={14} style={{ color: colorConfig.hex }} />
                    Memory Song (Spotify / YouTube link)
                  </label>
                  <input
                    type="url"
                    value={songUrl}
                    onChange={(e) => setSongUrl(e.target.value)}
                    placeholder="https://open.spotify.com/track/…"
                    className="mt-2 w-full rounded-xl border border-[#DCD3C7] bg-[#FAF7F2] px-3 py-2 text-sm text-[#2C2523] outline-none focus:border-[#C85A32]"
                  />
                  {embedUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <iframe
                        src={embedUrl}
                        title={`Song preview for ${title}`}
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        className="h-[84px] w-full"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-16 w-1 shrink-0"
                    style={{ backgroundColor: colorConfig.hex }}
                  />
                  <div className="flex-1 overflow-hidden rounded-xl border border-[#E8E2D9] bg-[#FAF7F2] shadow-sm">
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
              PHOTO CAROUSEL — swipe + always-visible arrows. In edit mode we
              also render add/remove controls below the carousel.
              --------------------------------------------------------------- */}
          <div className="mt-8 rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-4 sm:p-6 shadow-sm">
            {photoUrlsForCarousel.length > 0 ? (
              <div className="relative">
                <div
                  className="relative aspect-4/3 sm:aspect-16/10 w-full overflow-hidden rounded-2xl bg-[#F4EFE6] select-none touch-pan-y"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <Image
                    src={photoUrlsForCarousel[activePhotoIndex]}
                    alt={`${title} — photo ${activePhotoIndex + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 700px"
                    className="object-cover transition-opacity duration-300"
                    unoptimized
                    priority
                  />

                  {photoUrlsForCarousel.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevPhoto}
                        aria-label="Previous photo"
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#2C2523]/75 text-white backdrop-blur-xs transition hover:bg-[#2C2523] active:scale-95 shadow-md"
                      >
                        <ChevronLeft size={22} />
                      </button>
                      <button
                        type="button"
                        onClick={nextPhoto}
                        aria-label="Next photo"
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#2C2523]/75 text-white backdrop-blur-xs transition hover:bg-[#2C2523] active:scale-95 shadow-md"
                      >
                        <ChevronRight size={22} />
                      </button>
                    </>
                  )}
                </div>

                {photoUrlsForCarousel.length > 1 && (
                  <div className="mt-4 flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[#8C827A]">
                      Photo {activePhotoIndex + 1} of {photoUrlsForCarousel.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {photoUrlsForCarousel.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActivePhotoIndex(i)}
                          aria-label={`Go to photo ${i + 1}`}
                          className={`h-2 rounded-full transition-all ${
                            i === activePhotoIndex ? "w-6" : "w-2 bg-[#DCD3C7] hover:bg-[#B8ADA1]"
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
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#DFD6C9] py-14 text-center text-[#8C827A]">
                <ImageOff size={28} className="text-[#B8ADA1]" />
                <p className="font-handwriting text-2xl text-[#786F6A]">
                  No photos added yet
                </p>
              </div>
            )}

            {/* Photo management — appears only in page edit mode */}
            {editMode && (
              <div className="mt-4 border-t border-[#F2ECE1] pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#786F6A]">
                  Photos
                </p>

                {/* removed-photo grid: stored existing photos with remove +
                    "Set as cover photo" option under each */}
                {photoUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {photoUrls.map((url, i) => {
                      const target = { kind: "existing", id: url };
                      const current = isCover(target);
                      return (
                        <div
                          key={url}
                          className={`group relative rounded-2xl overflow-hidden bg-[#EFE8DC] border transition ${
                            current
                              ? "border-2 border-[#C85A32]"
                              : "border-[#E8E2D9]"
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
                              className="absolute right-2 top-2 rounded-full bg-[#2C2523]/70 p-1.5 text-white backdrop-blur-xs transition hover:bg-[#C85A32]"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => openCoverCrop(target)}
                            className={`w-full border-t px-2 py-2 text-center text-[11px] font-semibold transition ${
                              current
                                ? "border-[#F0C7B8] bg-[#FDF2EC] text-[#C85A32]"
                                : "border-[#F2ECE1] bg-[#FAF7F2] text-[#786F6A] hover:bg-[#FDF2EC] hover:text-[#C85A32]"
                            }`}
                          >
                            {current ? "Edit cover position" : "Set as cover photo"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* new-file grid: freshly picked files awaiting upload, each
                    with the same "Set as cover photo" option */}
                {newFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {newFiles.map((entry, i) => {
                      const target = { kind: "new", id: entry.id };
                      const current = isCover(target);
                      return (
                        <div
                          key={entry.id}
                          className={`group relative rounded-2xl overflow-hidden bg-[#EFE8DC] border transition ${
                            current
                              ? "border-2 border-[#C85A32]"
                              : "border-[#E8E2D9]"
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
                              className="absolute right-2 top-2 rounded-full bg-[#2C2523]/70 p-1.5 text-white backdrop-blur-xs transition hover:bg-[#C85A32]"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => openCoverCrop(target)}
                            className={`w-full border-t px-2 py-2 text-center text-[11px] font-semibold transition ${
                              current
                                ? "border-[#F0C7B8] bg-[#FDF2EC] text-[#C85A32]"
                                : "border-[#F2ECE1] bg-[#FAF7F2] text-[#786F6A] hover:bg-[#FDF2EC] hover:text-[#C85A32]"
                            }`}
                          >
                            {current ? "Edit cover position" : "Set as cover photo"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-[#DCD3C7] bg-[#FAF7F2] px-4 py-2.5 text-xs font-semibold text-[#5C534E] transition hover:border-[#C85A32] hover:text-[#C85A32]">
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
              MOMENTS LIST — the full content of the date. Has its own
              independent "edit moments" pencil toggle.
              --------------------------------------------------------------- */}
          <section className="mt-8 rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-6 sm:p-8 shadow-xs">
            <div className="flex items-center justify-between gap-4 border-b border-[#F2ECE1] pb-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#786F6A]">
                <Flame size={14} style={{ color: colorConfig.hex }} />
                Moments
              </h2>

              <div className="flex items-center gap-2">
                {/* NSFW view toggle — unrelated to editing; filters the list */}
                {hasNsfwMoment && !momentsEditMode && (
                  <button
                    type="button"
                    onClick={() => setShowNsfw((v) => !v)}
                    aria-pressed={showNsfw}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
                    style={{
                      backgroundColor: showNsfw ? colorConfig.bgLight : "#FFFDF9",
                      borderColor: showNsfw ? colorConfig.border : "#DCD3C7",
                      color: showNsfw ? colorConfig.text : "#786F6A",
                    }}
                  >
                    <Flame size={13} style={{ color: colorConfig.hex }} />
                    {showNsfw ? "Hide NSFW" : "Show NSFW"}
                  </button>
                )}

                {/* Second pencil — the moments edit toggle (independent) */}
                <button
                  type="button"
                  onClick={() => {
                    if (momentsEditMode) {
                      // Exiting moments edit without saving => discard edits.
                      setMoments(normalizeMoments(memory.moments ?? []));
                    }
                    setMomentsEditMode((v) => !v);
                  }}
                  aria-pressed={momentsEditMode}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                    momentsEditMode
                      ? "border-[#C85A32] bg-[#FDF2EC] text-[#C85A32]"
                      : "border-[#E8E2D9] bg-[#FFFDF9] text-[#786F6A] hover:border-[#D8CEBF] hover:text-[#2C2523]"
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
                      <p className="text-sm text-[#8C827A]">
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#FAF7F2] border border-[#DCD3C7] px-4 py-2 text-xs font-semibold text-[#2C2523] transition hover:border-[#C85A32] hover:text-[#C85A32]"
                  >
                    <Plus size={14} /> Add Moment
                  </button>
                  <button
                    type="button"
                    onClick={() => addMoment(true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF2EC] border border-[#F0C7B8] px-4 py-2 text-xs font-semibold text-[#933B19] transition hover:border-[#C85A32]"
                  >
                    <Flame size={14} /> Add NSFW Moment
                  </button>

                  <button
                    type="button"
                    onClick={saveMoments}
                    disabled={savingMoments}
                    className="ml-auto inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#B34B24] disabled:opacity-60"
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
                <ul className="mt-5 space-y-3">
                  {visibleMoments.map((moment) => {
                    const revealed = !moment.is_nsfw || showNsfw;
                    return (
                      <li
                        key={moment.id}
                        className={`flex items-start gap-3 text-sm sm:text-base ${
                          moment.is_nsfw ? "italic" : ""
                        }`}
                        style={{
                          color: moment.is_nsfw ? colorConfig.text : "#2C2523",
                        }}
                      >
                        <span
                          aria-hidden
                          className="mt-2 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: colorConfig.hex }}
                        />
                        {moment.is_nsfw ? (
                          <>
                            <span
                              className="font-sans text-xs font-bold uppercase tracking-wide"
                              style={{ color: colorConfig.text }}
                            >
                              [NSFW]
                            </span>
                            {revealed && <span>{moment.text}</span>}
                          </>
                        ) : (
                          <span>{moment.text}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#DFD6C9] py-10 text-center text-[#8C827A]">
                  <p className="font-handwriting text-2xl text-[#786F6A]">
                    No moments yet
                  </p>
                  <p className="text-sm">Tap “Edit Moments” to add some.</p>
                </div>
              )
            )}
          </section>

          {error && (
            <p role="alert" className="mt-4 rounded-2xl border border-[#F8D4C8] bg-[#FDF2EC] p-4 text-sm font-medium text-[#C85A32]">
              {error}
            </p>
          )}
        </div>
      </article>

      {/* Cover photo crop modal — choose + position the polaroid cover */}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C2523]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-6 shadow-2xl sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF2EC] text-[#C85A32]">
              <AlertTriangle size={24} />
            </div>

            <h3 className="mt-4 text-xl font-bold text-[#2C2523]">
              Delete this memory?
            </h3>

            <p className="mt-2 text-sm leading-relaxed text-[#786F6A]">
              Are you sure you want to delete &ldquo;{title || "this memory"}&rdquo;?
              This will permanently remove the timeline entry and delete all attached
              photos from storage. This cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-[#786F6A] transition hover:text-[#2C2523]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteMemoryRow}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B34B24] disabled:opacity-60"
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
