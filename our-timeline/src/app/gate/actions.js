"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authCookieValue, sanitizeNextPath } from "@/lib/auth";
import { verifyAnswer, getQuestionById } from "@/lib/questions";

// Server action behind the /gate form. Verifies the submitted answer against
// the randomized question, then stores an auth cookie and redirects on.
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
  store.set(AUTH_COOKIE, authCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  const destination = sanitizeNextPath(String(formData.get("next") || ""));
  redirect(destination);
}