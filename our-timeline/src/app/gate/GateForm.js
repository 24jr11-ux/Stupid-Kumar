"use client";

import { useActionState, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { unlock } from "./actions";
import { LAST_ACTIVE_KEY } from "@/lib/session";
import { useAppTransitions } from "@/components/AppTransitions";

const initialState = { error: null };

function SubmitButton({ ready }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || !ready}
    className="primary-button mt-6 w-full px-6 py-3.5 text-sm font-semibold">
    {pending ? "Checking..." : "Unlock"}
  </button>;
}

function GateContent({ challenge, questionError, state, next, answer, setAnswer, formAction, retry, answerRef }) {
  return <div className="w-full max-w-md">
    <form action={formAction} className="gate-content w-full px-2 py-8 text-center sm:px-6">
      <Lock size={24} aria-hidden="true" className="mx-auto mb-5 text-[#FAF7F2]" />
      <h1 className="scrapbook-text font-handwriting text-5xl font-bold tracking-tight text-[#FAF7F2]">
        Stupid &amp; Kumar
      </h1>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="questionId" value={challenge?.id ?? ""} />
      <div className="mt-8 text-left">
        <label htmlFor="answer" className="scrapbook-text block text-sm font-semibold">
          {challenge?.question || (questionError ? "Unable to load a question." : "Choosing a question...")}
        </label>
        <input ref={answerRef} id="answer" type="text" name="answer" required
          disabled={!challenge || state?.success} value={answer} onChange={event => setAnswer(event.target.value)}
          className="mt-2.5 w-full rounded-2xl border border-[#FAF7F2]/60 bg-[#FAF7F2] px-4 py-3.5 text-sm text-[#332923] shadow-md outline-none transition focus:ring-2 focus:ring-[#332923]/50" />
      </div>
      {state?.error && <p role="alert" className="mt-4 rounded-xl bg-[#FAF7F2] p-3 text-sm font-medium text-[#332923] shadow-md">{state.error}</p>}
      {questionError && <button type="button" className="scrapbook-text mt-4 text-sm underline" onClick={retry}>Try loading again</button>}
      <SubmitButton ready={Boolean(challenge) && !state?.success} />
    </form>
  </div>;
}

export default function GateForm({ next }) {
  const [challenge, setChallenge] = useState(null);
  const [questionError, setQuestionError] = useState(false);
  const [questionAttempt, setQuestionAttempt] = useState(0);
  const [answer, setAnswer] = useState("");
  const [state, formAction] = useActionState(unlock, initialState);
  const router = useRouter();
  const { splash, holdGate } = useAppTransitions();
  const answerRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/gate/question", { cache: "no-store", signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error("Question unavailable"); return response.json(); })
      .then(value => { if (!controller.signal.aborted) { setChallenge(value); setQuestionError(false); } })
      .catch(() => { if (!controller.signal.aborted) setQuestionError(true); });
    return () => controller.abort();
  }, [questionAttempt]);

  useEffect(() => {
    if (!splash && challenge) answerRef.current?.focus({ preventScroll: true });
  }, [splash, challenge]);

  useLayoutEffect(() => {
    if (!state?.success) return;
    try { localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch { /* Cookie expiry still applies. */ }
    // Retain this gate in the root AnimatePresence while App Router replaces
    // the page. Its 450ms exit overlaps the timeline's fade/slide entrance.
    holdGate(<GateContent challenge={challenge} questionError={false} state={state}
      next={next} answer={answer} formAction={formAction} />);
    router.replace(state.next || "/");
  }, [state, router, holdGate, challenge, next, answer, formAction]);

  return <div className={state?.success ? "pointer-events-none invisible w-full max-w-md" : "relative w-full max-w-md"}>
    <GateContent challenge={challenge} questionError={questionError} state={state} next={next}
      answer={answer} setAnswer={setAnswer} formAction={formAction} answerRef={answerRef}
      retry={() => { setQuestionError(false); setQuestionAttempt(attempt => attempt + 1); }} />
  </div>;
}
