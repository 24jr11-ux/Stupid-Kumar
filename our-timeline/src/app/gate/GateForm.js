"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
import { unlock } from "./actions";

const initialState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full rounded-full bg-[#C85A32] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(200,90,50,0.4)] transition-all duration-200 hover:bg-[#B34B24] hover:shadow-[0_6px_24px_rgba(200,90,50,0.55)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Checking…" : "Unlock Our Timeline"}
    </button>
  );
}

export default function GateForm({ next, question, questionId }) {
  const [state, formAction] = useActionState(unlock, initialState);

  return (
    <form
      action={formAction}
      className="w-full rounded-3xl border border-[#5D433C] bg-[#382722] p-8 text-center shadow-2xl sm:p-10"
    >
      {/* Icon badge */}
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C85A32]/20 text-[#F8B79D] border border-[#C85A32]/40 shadow-inner">
        <Lock size={24} />
      </div>

      <p
        className="font-handwriting text-3xl font-bold text-[#FAF7F2]"
        style={{
          textShadow: "0 0 24px rgba(200, 90, 50, 0.4)",
        }}
      >
        Stupid &amp; Kumar
      </p>

      <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#FAF7F2]">
        Private Timeline
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-[#D4C8BA]">
        Answer our secret question to unlock our photos and memories.
      </p>

      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="questionId" value={questionId} />

      <div className="mt-8 text-left">
        <label
          htmlFor="answer"
          className="block text-sm font-semibold text-[#FAF7F2]"
        >
          {question}
        </label>

        <input
          id="answer"
          type="text"
          name="answer"
          required
          autoFocus
          placeholder="Type your answer…"
          className="mt-2.5 w-full rounded-2xl border border-[#5D433C] bg-[#2D1E1A] px-4 py-3.5 text-sm text-[#FAF7F2] outline-none transition placeholder:text-[#D4C8BA]/40 focus:border-[#C85A32] focus:bg-[#352520] focus:ring-2 focus:ring-[#C85A32]/30"
        />
      </div>

      {state?.error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[#C85A32] bg-[#2D1E1A] p-3 text-sm font-medium text-[#F8B79D]"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}