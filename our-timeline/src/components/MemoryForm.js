"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { supabase, uploadPhoto, deleteMemoryPhotos } from "@/lib/supabase";
import { compressImage } from "@/lib/imageCompression";
import { MEMORY_COLOR_TAGS, DEFAULT_COLOR_TAG } from "@/lib/colors";

const inputClass =
  "mt-1.5 w-full rounded-2xl border border-[#DCD3C7] bg-[#FAF7F2] px-4 py-3 text-sm text-[#2C2523] outline-none transition placeholder:text-[#A89F95] focus:border-[#C85A32] focus:bg-white focus:ring-2 focus:ring-[#C85A32]/20";
const labelClass = "block text-xs font-bold uppercase tracking-wider text-[#786F6A]";

// Turns picked File objects into ephemeral blob URLs (cleaned up on change).
function useObjectUrls(files) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => {
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [urls]);
  return urls;
}

export default function MemoryForm({ mode, memory, memoryId, defaultEntryNumber }) {
  const router = useRouter();
  const isEditing = mode === "edit";

  const [entryNumber, setEntryNumber] = useState(memory?.entry_number ?? defaultEntryNumber ?? 1);
  const [title, setTitle] = useState(memory?.title ?? "");
  const [date, setDate] = useState(memory?.date ?? "");
  const [location, setLocation] = useState(memory?.location ?? "");
  const [description, setDescription] = useState(memory?.description ?? "");
  const [bullets, setBullets] = useState(memory?.bullets?.length ? memory.bullets : [""]);
  const [nsfwText, setNsfwText] = useState(memory?.nsfw_text ?? "");
  const [songUrl, setSongUrl] = useState(memory?.song_url ?? "");
  const [chapterTag, setChapterTag] = useState(memory?.chapter_tag ?? "");
  const [colorTag, setColorTag] = useState(memory?.color_tag ?? DEFAULT_COLOR_TAG);

  // Photos currently stored on this memory (edit mode) that we keep unless removed.
  const [photoUrls, setPhotoUrls] = useState(memory?.photo_urls ?? []);
  // New files picked for upload in this session.
  const [newFiles, setNewFiles] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [error, setError] = useState(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Stable blob URLs for the new-file previews.
  const newFileUrls = useObjectUrls(newFiles);

  // --- bullets helpers ---------------------------------------------------
  function updateBullet(index, value) {
    setBullets((prev) => prev.map((b, i) => (i === index ? value : b)));
  }
  function addBullet() {
    setBullets((prev) => [...prev, ""]);
  }
  function removeBullet(index) {
    setBullets((prev) => (prev.length === 1 ? [""] : prev.filter((_, i) => i !== index)));
  }

  // --- photo helpers -----------------------------------------------------
  function onFilesPicked(e) {
    const files = Array.from(e.target.files ?? []);
    setNewFiles((prev) => [...prev, ...files]);
    e.target.value = ""; // allow picking the same file again later
  }
  function removeNewFile(index) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // --- submit (add / edit) -----------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const cleanBullets = bullets.map((b) => b.trim()).filter(Boolean);
    if (!title.trim() || !date || Number.isNaN(Number(entryNumber))) {
      setError("Title, date and entry number are required.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Client-side compress new photos
      const uploadedUrls = [];
      if (newFiles.length > 0) {
        setSubmitStatus(`Compressing ${newFiles.length} photo${newFiles.length > 1 ? "s" : ""}…`);
        const compressedFiles = [];
        for (const rawFile of newFiles) {
          const compressed = await compressImage(rawFile);
          compressedFiles.push(compressed);
        }

        // 2. Upload to Supabase Storage
        setSubmitStatus("Uploading photos…");
        for (const file of compressedFiles) {
          const url = await uploadPhoto(file, String(entryNumber));
          uploadedUrls.push(url);
        }
      }

      setSubmitStatus("Saving memory…");
      const finalPhotoUrls = [...photoUrls, ...uploadedUrls];

      const payload = {
        entry_number: Number(entryNumber),
        title: title.trim(),
        date,
        location: location.trim(),
        bullets: cleanBullets,
        description: description.trim(),
        nsfw_text: nsfwText.trim() || null,
        song_url: songUrl.trim() || null,
        chapter_tag: chapterTag.trim() || null,
        color_tag: colorTag || DEFAULT_COLOR_TAG,
        photo_urls: finalPhotoUrls.length > 0 ? finalPhotoUrls : null,
      };

      const result = isEditing
        ? await supabase.from("memories").update(payload).eq("id", memoryId).select("id").single()
        : await supabase.from("memories").insert(payload).select("id").single();

      if (result.error) throw new Error(result.error.message);

      router.push(`/memory/${result.data.id}`);
      router.refresh();
    } catch (err) {
      console.error("Failed to save memory:", err);
      setError(err?.message || "Something went wrong saving this memory.");
      setSubmitting(false);
      setSubmitStatus("");
    }
  }

  // --- delete memory -----------------------------------------------------
  async function handleDeleteMemory() {
    if (!isEditing || !memoryId) return;
    setDeleting(true);
    setError(null);

    try {
      // 1. Clean up storage photos
      if (photoUrls.length > 0) {
        await deleteMemoryPhotos(photoUrls);
      }

      // 2. Delete database row
      const { error: dbError } = await supabase.from("memories").delete().eq("id", memoryId);
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

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-8 rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-6 shadow-sm sm:p-8"
      >
        {/* Entry metadata row */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="entry_number">
              Entry #
            </label>
            <input
              id="entry_number"
              type="number"
              min="1"
              step="1"
              required
              value={entryNumber}
              onChange={(e) => setEntryNumber(e.target.value)}
              className={inputClass}
              placeholder="1"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="date">
              Date
            </label>
            <input
              id="date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="chapter_tag">
              Chapter / Season
            </label>
            <input
              id="chapter_tag"
              type="text"
              value={chapterTag}
              onChange={(e) => setChapterTag(e.target.value)}
              className={inputClass}
              placeholder="e.g. Chapter 1, Paris 2025"
            />
          </div>
        </div>

        {/* Title */}
        <div>
          <label className={labelClass} htmlFor="title">
            Memory Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${inputClass} font-handwriting text-2xl font-bold text-[#2C2523]`}
            placeholder="Our trip to the apple orchard…"
          />
        </div>

        {/* Location */}
        <div>
          <label className={labelClass} htmlFor="location">
            Location
          </label>
          <input
            id="location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
            placeholder="Where did this happen?"
          />
        </div>

        {/* Color Tag Selector */}
        <div>
          <label className={labelClass}>
            Color Theme <span className="font-normal normal-case text-[#8C827A]">(accents on detail page)</span>
          </label>
          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {MEMORY_COLOR_TAGS.map((col) => {
              const isSelected = colorTag.toLowerCase() === col.hex.toLowerCase();
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setColorTag(col.hex)}
                  className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all ${
                    isSelected
                      ? "border-[#C85A32] bg-[#FAF7F2] ring-2 ring-[#C85A32]/20 shadow-xs"
                      : "border-[#E8E2D9] bg-white hover:border-[#D8CEBF]"
                  }`}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-xs text-white"
                    style={{ backgroundColor: col.hex }}
                  >
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="truncate text-xs font-semibold text-[#2C2523]">
                    {col.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass} htmlFor="description">
            Story / Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="Write the full story of this memory…"
          />
        </div>

        {/* Dynamic Bullets */}
        <fieldset>
          <legend className={labelClass}>Highlights / Key Moments</legend>
          <div className="mt-2.5 space-y-2.5">
            {bullets.map((bullet, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={bullet}
                  onChange={(e) => updateBullet(i, e.target.value)}
                  className={inputClass}
                  placeholder={`Highlight ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeBullet(i)}
                  aria-label="Remove bullet"
                  className="mt-1.5 shrink-0 rounded-xl border border-[#DCD3C7] bg-[#FAF7F2] p-3 text-[#8C827A] transition hover:border-[#C85A32] hover:text-[#C85A32]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addBullet}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C85A32] transition hover:text-[#B34B24]"
          >
            <Plus size={15} /> Add another highlight
          </button>
        </fieldset>

        {/* NSFW Text */}
        <div className="rounded-2xl border border-[#E8E2D9] bg-[#FAF7F2] p-4 sm:p-5">
          <label className={labelClass} htmlFor="nsfw_text">
            Sensitive / NSFW Section <span className="font-normal normal-case text-[#8C827A]">(hidden behind a toggle on the memory page)</span>
          </label>
          <textarea
            id="nsfw_text"
            rows={2}
            value={nsfwText}
            onChange={(e) => setNsfwText(e.target.value)}
            className={inputClass}
            placeholder="Only revealed when the sensitive toggle is clicked on this memory…"
          />
        </div>

        {/* Song URL */}
        <div>
          <label className={labelClass} htmlFor="song_url">
            Memory Song <span className="font-normal normal-case text-[#8C827A]">(Spotify or YouTube share link)</span>
          </label>
          <input
            id="song_url"
            type="url"
            value={songUrl}
            onChange={(e) => setSongUrl(e.target.value)}
            className={inputClass}
            placeholder="https://open.spotify.com/track/… or https://youtu.be/…"
          />
        </div>

        {/* Photos */}
        <fieldset>
          <legend className={labelClass}>Photos</legend>

          {/* Stored photos */}
          {photoUrls.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photoUrls.map((url, i) => (
                <div key={url} className="group relative overflow-hidden rounded-2xl bg-[#EFE8DC] border border-[#E8E2D9]">
                  <div className="relative aspect-square">
                    <Image
                      src={url}
                      alt={`Photo ${i + 1}`}
                      fill
                      sizes="25vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoUrls((prev) => prev.filter((u) => u !== url))}
                    aria-label="Remove photo"
                    className="absolute right-2 top-2 rounded-full bg-[#2C2523]/70 p-1.5 text-white backdrop-blur-xs transition hover:bg-[#C85A32]"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Newly selected files */}
          {newFiles.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {newFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative overflow-hidden rounded-2xl bg-[#EFE8DC] border border-[#E8E2D9]">
                  <div className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newFileUrls[i]}
                      alt={`New photo ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewFile(i)}
                    aria-label="Remove photo"
                    className="absolute right-2 top-2 rounded-full bg-[#2C2523]/70 p-1.5 text-white backdrop-blur-xs transition hover:bg-[#C85A32]"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-dashed border-[#DCD3C7] bg-[#FAF7F2] px-5 py-3.5 text-sm font-semibold text-[#5C534E] transition hover:border-[#C85A32] hover:text-[#C85A32]">
            <Upload size={16} />
            <span>Select Photos</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onFilesPicked}
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-xs text-[#8C827A]">
            Photos are automatically optimized and compressed client-side before uploading.
          </p>
        </fieldset>

        {/* Error message */}
        {error && (
          <p role="alert" className="rounded-2xl border border-[#F8D4C8] bg-[#FDF2EC] p-4 text-sm font-medium text-[#C85A32]">
            {error}
          </p>
        )}

        {/* Submit & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E8E2D9] pt-6">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B34B24] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{submitStatus || "Saving…"}</span>
                </>
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Add memory"
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="rounded-full px-5 py-3 text-sm font-semibold text-[#786F6A] transition hover:text-[#2C2523]"
            >
              Cancel
            </button>
          </div>

          {/* Delete memory button on edit mode */}
          {isEditing && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#ECC0B5] bg-[#FFF8F6] px-4 py-2.5 text-xs font-semibold text-[#A85858] transition hover:bg-[#FDF2EC] hover:text-[#C85A32]"
            >
              <Trash2 size={14} />
              Delete memory
            </button>
          )}
        </div>
      </form>

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
              Are you sure you want to delete &ldquo;{title || "this memory"}&rdquo;? This will permanently remove the timeline entry and delete all attached photos from storage. This cannot be undone.
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
                onClick={handleDeleteMemory}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B34B24] disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deleting…</span>
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