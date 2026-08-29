"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { supabase, uploadPhoto } from "@/lib/supabase";

const inputClass =
  "mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:bg-white";
const labelClass = "block text-sm font-medium text-neutral-700";

// Turns picked File objects into ephemeral blob URLs (cleaned up on change).
function useObjectUrls(files) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => {
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [urls]);
  return urls;
}

// Shared form for creating ("new") and editing ("edit") a memory entry.
// Covers every schema field, including dynamic bullets and multi-file photo
// upload to Supabase Storage. On submit it saves the row and redirects to the
// detail page.
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

  // Photos currently stored on this memory (edit mode) that we keep unless removed.
  const [photoUrls, setPhotoUrls] = useState(memory?.photo_urls ?? []);
  // New files picked for upload in this session.
  const [newFiles, setNewFiles] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  // --- submit ------------------------------------------------------------
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
      // Upload any freshly picked photos first, then save the row with URLs.
      const uploadedUrls = [];
      for (const file of newFiles) {
        const url = await uploadPhoto(file, String(entryNumber));
        uploadedUrls.push(url);
      }
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
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      {/* Basics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="entry_number">
            Entry number
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
            placeholder="e.g. 1"
          />
        </div>
        <div className="sm:col-span-1">
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
        <div className="sm:col-span-1">
          <label className={labelClass} htmlFor="chapter_tag">
            Chapter tag
          </label>
          <input
            id="chapter_tag"
            type="text"
            value={chapterTag}
            onChange={(e) => setChapterTag(e.target.value)}
            className={inputClass}
            placeholder="e.g. Chapter 1"
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="title">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="A memory worth keeping"
        />
      </div>

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
          placeholder="Where it happened"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputClass}
          placeholder="Write the story of this memory…"
        />
      </div>

      {/* Dynamic bullets */}
      <fieldset>
        <legend className={labelClass}>Bullets</legend>
        <div className="mt-2 space-y-2">
          {bullets.map((bullet, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={bullet}
                onChange={(e) => updateBullet(i, e.target.value)}
                className={inputClass}
                placeholder={`Bullet ${i + 1}`}
              />
              <button
                type="button"
                onClick={() => removeBullet(i)}
                aria-label="Remove bullet"
                className="shrink-0 rounded-lg border border-neutral-300 p-2.5 text-neutral-400 transition hover:border-rose-300 hover:text-rose-500"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addBullet}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 transition hover:text-neutral-900"
        >
          <Plus size={15} /> Add bullet
        </button>
      </fieldset>

      {/* NSFW text */}
      <div>
        <label className={labelClass} htmlFor="nsfw_text">
          NSFW text <span className="font-normal text-neutral-400">(hidden behind a toggle)</span>
        </label>
        <textarea
          id="nsfw_text"
          rows={2}
          value={nsfwText}
          onChange={(e) => setNsfwText(e.target.value)}
          className={inputClass}
          placeholder="Only shown on the detail page when the NSFW toggle is on…"
        />
      </div>

      {/* Song */}
      <div>
        <label className={labelClass} htmlFor="song_url">
          Song URL <span className="font-normal text-neutral-400">(Spotify or YouTube link)</span>
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

        {/* Existing (stored) photos — removable in edit mode */}
        {photoUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photoUrls.map((url, i) => (
              <div key={url} className="group relative overflow-hidden rounded-xl bg-neutral-200">
                <div className="relative aspect-square">
                  <Image
                    src={url}
                    alt={`Existing photo ${i + 1}`}
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
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-90 transition hover:bg-black/80"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Newly picked files */}
        {newFiles.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {newFiles.map((file, i) => (
              <div key={`${file.name}-${i}`} className="relative overflow-hidden rounded-xl bg-neutral-200">
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
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-90 transition hover:bg-black/80"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900">
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
        <p className="mt-2 text-xs text-neutral-400">
          Uploaded straight to Supabase Storage; the public URLs get saved on this memory.
        </p>
      </fieldset>

      {/* Error + submit */}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Saving…" : isEditing ? "Save changes" : "Add memory"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full px-4 py-3 text-sm font-semibold text-neutral-500 transition hover:text-neutral-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}