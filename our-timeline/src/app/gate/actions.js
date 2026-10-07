"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS, authCookieValue, sanitizeNextPath } from "@/lib/auth";
import { verifyAnswer, getQuestionById } from "@/lib/questions";

// Server action behind the /gate form. Verifies the submitted answer against
// the randomized question, then stores an auth cookie. Navigation itself is
// driven client-side so the gate can animate the lava "flowing out" first.
export async function unlock(prevState, formData) {
  const questionId = Number(formData.get("questionId"));
  const answer = String(formData.get("answer") || "").trim();

  const question = getQuestionById(questionId);
  if (!question) {
    return { error: "That question is no longer valid. Please try again." };
  }

  const matches = verifyAnswer(questionId, answer);

  if (!matches) {
    return { error: "Try again." };
  }

  // Persist auth in a cookie (never the raw answer).
  const store = await cookies();
  store.set(AUTH_COOKIE, authCookieValue(), AUTH_COOKIE_OPTIONS);

  const destination = sanitizeNextPath(String(formData.get("next") || ""));
  return { success: true, next: destination };
}