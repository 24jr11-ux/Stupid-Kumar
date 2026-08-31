"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Lock } from "lucide-react";
import { unlock } from "./actions";

const initialState = { error: null };

// Small submit button so we can reflect the pending state while the server
// action runs.
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 w-full rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Checking…" : "Unlock"}
    </button>
  );
}

// The passphrase form. Submits to the `unlock` server action; on success the
// action sets a cookie and redirects back to where the visitor was going.
export default function GateForm({ next, question, questionId }) {
  const [state, formAction] = useActionState(unlock, initialState);

  return (
    <form
      action={formAction}
      className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm"
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
        <Lock size={20} />
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Private timeline</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Answer the question to keep scrolling through the good stuff.
      </p>

      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="questionId" value={questionId} />

      <label htmlFor="answer" className="mt-6 block text-sm font-medium text-neutral-700">
        {question}
      </label>

      <input
        id="answer"
        type="text"
        name="answer"
        required
        autoFocus
        placeholder="Your answer"
        className="mt-3 w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:bg-white"
      />

      {state?.error && (
        <p role="alert" className="mt-3 text-sm font-medium text-rose-600">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="mt-4 text-xs text-neutral-400">
        No hardcoded passphrases here — it lives in your environment.
      </p>
    </form>
  );
}