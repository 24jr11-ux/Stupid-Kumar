import "server-only";
import { randomUUID } from "node:crypto";
import { BlobNotFoundError, BlobPreconditionFailedError, del, get, list, put } from "@vercel/blob";
import { DEFAULT_COLOR_TAG } from "@/lib/colors";

const DATA_PATH = "data/memories.json";
const options = () => ({ token: process.env.BLOB_READ_WRITE_TOKEN });

export async function readMemories() {
  let blob;
  try {
    blob = await get(DATA_PATH, { ...options(), access: "private", useCache: false });
  } catch (error) {
    if (error instanceof BlobNotFoundError) return { memories: [], etag: null };
    throw error;
  }
  if (!blob) return { memories: [], etag: null };
  const memories = JSON.parse(await new Response(blob.stream).text());
  if (!Array.isArray(memories)) throw new Error("Memory data is invalid.");
  return { memories, etag: blob.blob.etag };
}

async function changeMemories(change) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { memories, etag } = await readMemories();
    const result = change(memories);
    try {
      await put(DATA_PATH, JSON.stringify(memories), {
        ...options(), access: "private", contentType: "application/json",
        allowOverwrite: !!etag, ...(etag ? { ifMatch: etag } : {}),
        cacheControlMaxAge: 60,
      });
      return result;
    } catch (error) {
      if (!(error instanceof BlobPreconditionFailedError) && error?.name !== "BlobAlreadyExistsError") throw error;
    }
  }
  throw new Error("Memory data changed at the same time. Please try again.");
}

export async function createMemory(date) {
  return changeMemories((memories) => {
    const memory = {
      id: randomUUID(), entry_number: Math.max(0, ...memories.map((m) => Number(m.entry_number) || 0)) + 1,
      title: "New Date", date, moments: [], song_url: null, song_title: null,
      song_artist: null, song_cover_url: null, photo_urls: [],
      cover_photo_url: null, cover_photo_position: { x: 50, y: 50 },
      color_tag: DEFAULT_COLOR_TAG, created_at: new Date().toISOString(),
    };
    memories.push(memory);
    return memory;
  });
}

export async function updateMemory(id, patch) {
  const allowed = ["title", "date", "entry_number", "color_tag", "moments", "song_url", "song_title", "song_artist", "song_cover_url", "photo_urls", "cover_photo_url", "cover_photo_position"];
  const updated = await changeMemories((memories) => {
    const memory = memories.find((m) => m.id === id);
    if (!memory) throw new Error("Memory not found.");
    for (const key of allowed) if (Object.hasOwn(patch, key)) memory[key] = patch[key];
    return structuredClone(memory);
  });
  if (Object.hasOwn(patch, "photo_urls")) {
    const keep = new Set(updated.photo_urls || []);
    await deleteUnreferencedPhotos(id, keep);
  }
  return updated;
}

async function deleteUnreferencedPhotos(id, keep = new Set()) {
  let cursor;
  do {
    const page = await list({ ...options(), prefix: `photos/${id}/`, cursor });
    const unused = page.blobs.filter((b) => !keep.has(b.url)).map((b) => b.url);
    if (unused.length) await del(unused, options());
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}

export async function deleteMemory(id) {
  await changeMemories((memories) => {
    const index = memories.findIndex((m) => m.id === id);
    if (index < 0) throw new Error("Memory not found.");
    memories.splice(index, 1);
  });
  await deleteUnreferencedPhotos(id);
}

export async function uploadMemoryPhoto(id, file) {
  const { memories } = await readMemories();
  if (!memories.some((m) => m.id === id)) throw new Error("Memory not found.");
  if (!file || !file.type?.startsWith("image/")) throw new Error("Choose an image file.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80) || "photo";
  const blob = await put(`photos/${id}/${randomUUID()}-${safeName}`, file, {
    ...options(), access: "private", contentType: file.type,
  });
  return blob.url;
}
