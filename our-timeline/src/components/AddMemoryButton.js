"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePlus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_COLOR_TAG } from "@/lib/colors";

// Supabase errors are PostgrestError objects whose serializable fields live on
// the object but can show up as `{}` in the console overlay. Extract a readable
// message so real failures are visible instead of a bare `{}`.
function extractErrorMessage(err) {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  const msg = err.message ?? err.details ?? err.hint;
  return msg ? String(msg) : "Something went wrong.";
}

/**
 * "+ Add Memory" — instead of navigating to a separate create page, this
 * immediately inserts a fresh draft row into Supabase, then sends the user
 * straight to that new entry's detail page with edit mode already active.
 *
 * DRAFT-CREATION FLOW:
 *  1. Compute the next entry_number (max existing + 1, same rule as before).
 *     computeNextEntryNumber is retried a couple of times in case two drafts
 *     are created close together (rare double-click race) so we don't end up
 *     with duplicate entry_numbers.
 *  2. Insert a row with date = today, title = "New Date", empty moments,
 *     no photos, and no color set yet (falls back to the default accent).
 *  3. Redirect to `/memory/{id}?edit=1&new=1`. The `new=1` flag marks this as
 *     a freshly created empty draft so the detail page knows to delete the
 *     row if the user cancels without adding anything (see MemoryDetail).
 */
export default function AddMemoryButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function nextEntryNumber() {
    const { data, error } = await supabase
      .from("memories")
      .select("entry_number")
      .order("entry_number", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Failed to read next entry number:", error?.message);
      return 1;
    }
    return (data?.[0]?.entry_number ?? 0) + 1;
  }

  async function handleClick() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const entryNumber = await nextEntryNumber();

      // Date defaults to today (local timezone, formatted as YYYY-MM-DD).
      const today = new Date();
      const todayIso = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      const { data, error } = await supabase
        .from("memories")
        .insert({
          entry_number: entryNumber,
          title: "New Date",
          date: todayIso,
          moments: [],                 // no moments yet — this is a blank draft
          song_url: null,
          photo_urls: [],              // no photos yet
          color_tag: DEFAULT_COLOR_TAG,
        })
        .select("id")
        .single();

      if (error) throw error;

      // `new=1` flags the row as a just-created empty draft.
      router.push(`/memory/${data.id}?edit=1&new=1`);
      router.refresh();
    } catch (err) {
      const message = extractErrorMessage(err);
      console.error("Failed to create draft memory:", err, "->", message);
      setError(message);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B34B24] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 size={17} className="animate-spin" /> : <CirclePlus size={17} />}
        <span>{pending ? "Creating…" : "Add Memory"}</span>
      </button>
      {error && (
        <p
          role="alert"
          className="max-w-xs rounded-xl bg-[#FDF2EC] px-3 py-2 text-right text-xs font-medium text-[#C85A32] border border-[#F9DCD0]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
