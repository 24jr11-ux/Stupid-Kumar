import { get } from "@vercel/blob";
import { cookies } from "next/headers";
import { isAuthorized } from "@/lib/auth";
import { readMemories } from "@/lib/memories";

export async function GET(request) {
  if (!isAuthorized(await cookies())) return new Response(null, { status: 401 });
  const url = new URL(request.url).searchParams.get("url");
  const { memories } = await readMemories();
  if (!memories.some((memory) => (memory.photo_urls || []).includes(url))) {
    return new Response(null, { status: 404 });
  }
  const blob = await get(url, {
    access: "private", token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  if (!blob) return new Response(null, { status: 404 });
  return new Response(blob.stream, {
    headers: { "Content-Type": blob.blob.contentType, "Cache-Control": "private, max-age=60" },
  });
}
