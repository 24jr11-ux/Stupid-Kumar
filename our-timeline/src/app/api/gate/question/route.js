import { cookies } from "next/headers";
import { getQuestions } from "@/lib/questions";
import { chooseQuestion } from "@/lib/questionRotation";

export const dynamic = "force-dynamic";
const HISTORY_COOKIE = "timeline_question_history";

export async function GET() {
  const store = await cookies();
  let history = [];
  try { history = JSON.parse(store.get(HISTORY_COOKIE)?.value || "[]"); } catch { /* Start a fresh round. */ }
  const choice = chooseQuestion(getQuestions(), history);
  store.set(HISTORY_COOKIE, JSON.stringify(choice.history), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 30 * 24 * 60 * 60,
  });
  return Response.json({ id: choice.question.id, question: choice.question.question }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
