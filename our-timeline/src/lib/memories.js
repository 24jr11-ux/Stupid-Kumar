import "server-only";
import { randomUUID } from "node:crypto";
import { BlobNotFoundError, del, get, list, put } from "@vercel/blob";
import { DEFAULT_COLOR_TAG } from "@/lib/colors";

const DATA_PATH = "data/memories.json";
const options = () => ({ token: process.env.BLOB_READ_WRITE_TOKEN });
const WRITE_QUEUE = Symbol.for("our-timeline.memories-write-queue");

export async function readMemories() {
  let blob;
  try {
    blob = await get(DATA_PATH, { ...options(), access: "private", useCache: false });
  } catch (error) {
    if (error instanceof BlobNotFoundError) return { memories: [] };
    throw error;
  }
  if (!blob) return { memories: [] };
  const memories = JSON.parse(await new Response(blob.stream).text());
  if (!Array.isArray(memories)) throw new Error("Memory data is invalid.");
  return { memories };
}

function changeMemories(change, afterWrite) {
  // Keep read/modify/write operations in order within this server instance.
  // Always reread the private Blob at origin before merging the next change.
  const previousWrite = globalThis[WRITE_QUEUE] || Promise.resolve();
  const write = previousWrite.then(async () => {
    const { memories } = await readMemories();
    const result = change(memories);
    await put(DATA_PATH, JSON.stringify(memories), {
      ...options(), access: "private", contentType: "application/json",
      allowOverwrite: true, cacheControlMaxAge: 60,
    });
    if (afterWrite) await afterWrite(result);
    return result;
  });
  globalThis[WRITE_QUEUE] = write.catch(() => {});
  return write;
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
  const result = await changeMemories((memories) => {
    const memory = memories.find((m) => m.id === id);
    if (!memory) throw new Error("Memory not found.");
    const previousPhotos = memory.photo_urls || [];
    for (const key of allowed) if (Object.hasOwn(patch, key)) memory[key] = patch[key];
    const removedPhotos = Object.hasOwn(patch, "photo_urls")
      ? previousPhotos.filter((url) => !(memory.photo_urls || []).includes(url))
      : [];
    return { memory: structuredClone(memory), removedPhotos };
  }, async ({ removedPhotos }) => {
    if (removedPhotos.length) await del(removedPhotos, options());
  });
  return result.memory;
}

async function deleteMemoryPhotos(id) {
  let cursor;
  do {
    const page = await list({ ...options(), prefix: `photos/${id}/`, cursor });
    if (page.blobs.length) await del(page.blobs.map((b) => b.url), options());
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}

export async function deleteMemory(id) {
  await changeMemories((memories) => {
    const index = memories.findIndex((m) => m.id === id);
    if (index < 0) throw new Error("Memory not found.");
    memories.splice(index, 1);
  }, () => deleteMemoryPhotos(id));
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
