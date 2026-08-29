import { NextResponse } from "next/server";
import { AUTH_COOKIE, authCookieValue } from "@/lib/auth";

// Next.js 16 renamed `middleware` to `proxy`. This file runs before a request
// reaches any page and enforces the passphrase gate:
//   - authorized visitors (valid cookie) pass through
//   - everyone else is redirected to /gate, remembering where they were going
//
// Paths that must stay public for the app to function (gate page, service
// worker, manifest, icons, etc.) are allowed through below.

const PUBLIC_PATHS = ["/gate"];

// Catch-all matcher minus Next.js internals; the public-path allowlist below
// does the rest.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt).*)"],
};

export function proxy(request) {
  const { pathname, search } = request.nextUrl;

  // Static assets and the auth-less entry points never require a cookie.
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    /^\/(sw\.js|worker-.+\.js|workbox-.+\.js|fallback-.+\.js|icons\/.+)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // If the visitor has a valid auth cookie, let them in.
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && authCookieValue() && cookie === authCookieValue()) {
    return NextResponse.next();
  }

  // Otherwise send them to the gate, preserving their destination.
  const url = new URL("/gate", request.url);
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}