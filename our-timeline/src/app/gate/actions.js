"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, authCookieValue, passphraseMatches, sanitizeNextPath } from "@/lib/auth";

// Server action behind the /gate form. Verifies the submitted passphrase
// against PASSPHRASE (env), then stores an auth cookie and redirects on.
export async function unlock(prevState, formData) {
  const submitted = String(formData.get("passphrase") || "");

  if (!passphraseMatches(submitted)) {
    return { error: "Incorrect passphrase. Please try again." };
  }

  // Persist auth in a cookie (never the raw passphrase).
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