import { createHash } from "node:crypto";

// Shared helpers for the passphrase gate. Everything relevant is read from
// process.env at request time — never hardcoded.
//
// Only runs server-side (proxy + server actions), so it's safe to import
// node:crypto here.

export const AUTH_COOKIE = "timeline_auth";

// The passphrase, read from the environment.
export function getPassphrase() {
  return process.env.PASSPHRASE || "";
}

// Constant-time-ish compare of a user-provided passphrase against the env one.
export function passphraseMatches(input) {
  const expected = getPassphrase();
  if (!expected || typeof input !== "string" || !input) return false;
  const a = createHash("sha256").update(input, "utf8").digest("hex");
  const b = createHash("sha256").update(expected, "utf8").digest("hex");
  return a === b;
}

// The value stored in the auth cookie: a hash of the passphrase, so we never
// leave the plaintext passphrase in the browser.
export function authCookieValue() {
  const pass = getPassphrase();
  if (!pass) return "";
  return createHash("sha256").update(`timeline:${pass}`).digest("hex");
}

// Given a Next.js cookie store (from `await cookies()`), is this visitor
// already authorized?
export function isAuthorized(cookieStore) {
  const expected = authCookieValue();
  if (!expected) return false;
  const value = cookieStore.get(AUTH_COOKIE)?.value;
  return !!value && value === expected;
}

// Only allow safe internal redirects (prevents open redirects on /gate).
export function sanitizeNextPath(next) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}