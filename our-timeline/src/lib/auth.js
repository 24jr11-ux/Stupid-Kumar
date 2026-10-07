import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { SESSION_IDLE_MS } from "./session.js";

export const AUTH_COOKIE = "timeline_auth";
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
  path: "/", maxAge: SESSION_IDLE_MS / 1000,
};

export function getPassphrase() { return process.env.PASSPHRASE || ""; }

export function passphraseMatches(input) {
  const expected = getPassphrase();
  if (!expected || typeof input !== "string" || !input) return false;
  return timingSafeEqual(createHash("sha256").update(input).digest(), createHash("sha256").update(expected).digest());
}

function signature(expires) {
  return createHmac("sha256", getPassphrase()).update("timeline-session:" + expires).digest("hex");
}

// Signed expiry is checked on the server as well as by the browser's cookie lifetime.
export function authCookieValue(now = Date.now()) {
  if (!getPassphrase()) return "";
  const expires = now + SESSION_IDLE_MS;
  return expires + "." + signature(expires);
}

export function isValidAuthCookie(value, now = Date.now()) {
  if (!getPassphrase() || typeof value !== "string") return false;
  const match = /^(\d+)\.([a-f0-9]{64})$/.exec(value);
  if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) <= now) return false;
  return timingSafeEqual(Buffer.from(match[2], "hex"), Buffer.from(signature(match[1]), "hex"));
}

export function isAuthorized(cookieStore) {
  return isValidAuthCookie(cookieStore.get(AUTH_COOKIE)?.value);
}

export function sanitizeNextPath(next) {
  return next && next.startsWith("/") && !next.startsWith("//") && !/[\\\r\n]/.test(next) ? next : "/";
}
