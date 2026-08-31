import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthorized, sanitizeNextPath } from "@/lib/auth";
import { getQuestions } from "@/lib/questions";
import GateForm from "./GateForm";

// /gate — the passphrase/question entry point. Visitors who are already authed skip
// straight to where they were headed.
export const dynamic = "force-dynamic";

// Pick a random question from the bank. Lives outside the component so the
// impure Math.random call isn't flagged during render.
function pickQuestion() {
  const questions = getQuestions();
  const index = Math.floor(Math.random() * questions.length);
  return questions[index];
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
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#FAF7F2] px-4 py-12">
      <GateForm next={next} question={question.question} questionId={question.id} />
    </main>
  );
}