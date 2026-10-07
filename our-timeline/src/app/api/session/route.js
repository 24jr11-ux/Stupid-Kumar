import { cookies } from "next/headers";
import { AUTH_COOKIE, AUTH_COOKIE_OPTIONS, authCookieValue, isAuthorized } from "@/lib/auth";

function sameOrigin(request) {
  try {
    const origin = new URL(request.headers.get("origin") || "");
    const protocol = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.slice(0, -1);
    return origin.host === (request.headers.get("x-forwarded-host") || request.headers.get("host")) && origin.protocol === protocol + ":";
  } catch { return false; }
}

export async function POST(request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const store = await cookies();
  if (!isAuthorized(store)) return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  store.set(AUTH_COOKIE, authCookieValue(), AUTH_COOKIE_OPTIONS);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  (await cookies()).delete(AUTH_COOKIE);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
