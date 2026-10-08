"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { memoryRequest } from "@/lib/memoryApi";

function extractErrorMessage(err) {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  const msg = err.message ?? err.details ?? err.hint;
  return msg ? String(msg) : "Something went wrong.";
}

/**
 * Add memory button.
 * Immediately creates a fresh draft memory and redirects to its detail page.
 */
export default function AddMemoryButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const today = new Date();
      const todayIso = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      const memory = await memoryRequest("/api/memories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: todayIso }),
      });
      router.push(`/memory/${memory.id}?edit=1&new=1`);
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
        aria-label={pending ? "Creating memory" : "Add memory"}
        className="primary-button inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
      >
        {pending ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}
        <span>{pending ? "Creating…" : "Add Memory"}</span>
      </button>
      {error && (
        <p
          role="alert"
          className="max-w-xs rounded-xl bg-[#2D1E1A] px-3 py-2 text-right text-xs font-medium text-[#EBCDB5] border border-[#76513E]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
