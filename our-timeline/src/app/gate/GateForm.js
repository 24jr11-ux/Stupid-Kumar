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
      className="mt-6 w-full rounded-full bg-[#C85A32] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B34B24] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
      className="w-full max-w-md rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-8 text-center shadow-lg sm:p-10"
    >
      {/* Icon badge */}
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDF2EC] text-[#C85A32] shadow-inner">
        <Lock size={24} />
      </div>

      <p className="font-handwriting text-2xl font-bold text-[#C85A32]">
        Stupid &amp; Kumar
      </p>

      <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#2C2523]">
        Private Timeline
      </h1>

      <p className="mt-2 text-sm leading-relaxed text-[#786F6A]">
        Answer our secret question to unlock all the photos and memories.
      </p>

      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="questionId" value={questionId} />

      <div className="mt-8 text-left">
        <label
          htmlFor="answer"
          className="block text-sm font-semibold text-[#2C2523]"
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
          className="mt-2.5 w-full rounded-2xl border border-[#DCD3C7] bg-[#FAF7F2] px-4 py-3.5 text-sm text-[#2C2523] outline-none transition placeholder:text-[#A89F95] focus:border-[#C85A32] focus:bg-white focus:ring-2 focus:ring-[#C85A32]/20"
        />
      </div>

      {state?.error && (
        <p role="alert" className="mt-4 rounded-xl bg-[#FDF2EC] p-3 text-sm font-medium text-[#C85A32] border border-[#F9DCD0]">
          {state.error}
        </p>
      )}

      <SubmitButton />


    </form>
  );
}