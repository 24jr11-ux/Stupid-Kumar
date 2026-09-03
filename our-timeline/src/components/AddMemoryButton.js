"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CirclePlus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_COLOR_TAG } from "@/lib/colors";

function extractErrorMessage(err) {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  const msg = err.message ?? err.details ?? err.hint;
  return msg ? String(msg) : "Something went wrong.";
}

/**
 * "+ Add Memory" button.
 * Immediately creates a fresh draft row in Supabase and redirects to its detail page.
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
          moments: [],
          song_url: null,
          photo_urls: [],
          color_tag: DEFAULT_COLOR_TAG,
        })
        .select("id")
        .single();

      if (error) throw error;

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
        className="inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(200,90,50,0.35)] transition-all duration-200 hover:bg-[#B34B24] hover:shadow-[0_6px_22px_rgba(200,90,50,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <Loader2 size={17} className="animate-spin" /> : <CirclePlus size={17} />}
        <span>{pending ? "Creating…" : "Add Memory"}</span>
      </button>
      {error && (
        <p
          role="alert"
          className="max-w-xs rounded-xl bg-[#2D1E1A] px-3 py-2 text-right text-xs font-medium text-[#F8B79D] border border-[#C85A32]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
