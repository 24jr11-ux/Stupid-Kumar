import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthorized, sanitizeNextPath } from "@/lib/auth";
import { QUESTIONS } from "@/lib/questions";
import GateForm from "./GateForm";

// /gate — the passphrase entry point. Visitors who are already authed skip
// straight to where they were headed.
export const dynamic = "force-dynamic";

// Pick a random question from the bank. Lives outside the component so the
// impure Math.random call isn't flagged during render.
function pickQuestion() {
  const index = Math.floor(Math.random() * QUESTIONS.length);
  return QUESTIONS[index];
}

export default async function GatePage({ searchParams }) {
  const params = await searchParams;
  const next = sanitizeNextPath(String(params?.next || "/"));

  const cookieStore = await cookies();
  if (isAuthorized(cookieStore)) {
    redirect(next);
  }

  const question = pickQuestion();

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-4">
      <GateForm next={next} question={question.question} questionId={question.id} />
    </main>
  );
}