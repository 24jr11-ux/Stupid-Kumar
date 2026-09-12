"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { MeshGradient } from "@paper-design/shaders-react";
import { Lock } from "lucide-react";
import { unlock } from "./actions";
import { VIVID_ORANGE, VIVID_WARM_GREEN } from "@/lib/colors";

const initialState = { error: null };
const NAVIGATE_DELAY_MS = 1400; // let the lava flow out, then open the timeline

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
  const router = useRouter();
  // Derived from the server action's answer, so no extra state to sync.
  const expanded = Boolean(state?.success);

  // After a correct answer the lava has ~1.4s to cover the screen, then we
  // hand off to the timeline (which paints the same full-page lava).
  useEffect(() => {
    if (!state?.success) return;
    const go = setTimeout(
      () => router.replace(state?.next || "/"),
      NAVIGATE_DELAY_MS
    );
    return () => clearTimeout(go);
  }, [state, router]);

  return (
    <div className="relative w-full max-w-md">
      {/* Lava layer — confined to the card when locked. On unlock its inset
          animates out to fill the whole viewport (the MeshGradient re-renders
          at each size, so the flow stays crisp instead of scaling up a bitmap).
          Anchored on the card wrapper which is centered on the black screen,
          so expanding to 50% - 50vw/vh makes the layer meet every viewport edge. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl transition-all duration-[1300ms] ease-[cubic-bezier(0.65,0,0.35,1)] ${
          expanded ? "inset-[calc(50%-50vh)_calc(50%-50vw)]" : "inset-0"
        }`}
      >
        <MeshGradient
          colors={[VIVID_ORANGE, VIVID_WARM_GREEN]}
          speed={0.3}
          distortion={0.75}
          swirl={0.4}
          grainMixer={0.15}
          grainOverlay={0.05}
          fit="cover"
          maxPixelCount={700_000}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
      </div>

      <form
        action={formAction}
        className={`relative z-10 w-full overflow-hidden rounded-3xl border border-[#5D433C] bg-black/45 p-8 text-center shadow-2xl backdrop-blur-[3px] transition-opacity duration-500 sm:p-10 ${
          expanded ? "pointer-events-none opacity-0" : ""
        }`}
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
            className="mt-2.5 w-full rounded-2xl border border-[#5D433C] bg-[#2D1E1A]/90 px-4 py-3.5 text-sm text-[#FAF7F2] outline-none transition placeholder:text-[#D4C8BA]/40 focus:border-[#C85A32] focus:bg-[#352520] focus:ring-2 focus:ring-[#C85A32]/30"
          />
        </div>

        {state?.error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-[#C85A32] bg-[#2D1E1A]/90 p-3 text-sm font-medium text-[#F8B79D]"
          >
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}