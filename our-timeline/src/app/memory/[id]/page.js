import { notFound } from "next/navigation";
import MemoryDetail from "@/components/MemoryDetail";
import { readMemories } from "@/lib/memories";
import { memoryColorHex, memoryColorIsLight } from "@/lib/colors";
import { DetailPageTransition } from "@/components/AppTransitions";

export const dynamic = "force-dynamic";

async function getMemory(id) {
  const { memories } = await readMemories();
  return memories.find((memory) => memory.id === id) ?? null;
}

export default async function MemoryPage({ params, searchParams }) {
  const { id } = await params;
  const qs = await searchParams;
  const memory = await getMemory(id);

  if (!memory) notFound();

  // Query flags:
  //  - edit=1 -> start with the page-level edit mode already active
  //  - new=1  -> this row is a just-created empty draft; cancelling out of
  //              edit mode without changes deletes the row (see MemoryDetail)
  const initialEdit = qs?.edit === "1";
  const isNewDraft = qs?.new === "1";

  return (
    <DetailPageTransition key={memory.id}
      className={`memory-detail-page min-h-screen flex flex-1 justify-center px-4 pb-24 ${
        memoryColorIsLight(memory.color_tag) ? "memory-detail-page--light" : ""
      }`}
      data-memory-page={memory.id}
      style={{ "--date-color": memoryColorHex(memory.color_tag) }}
    >
      <main className="relative z-10 w-full max-w-2xl pt-8 sm:pt-10">
        <MemoryDetail memory={memory} initialEdit={initialEdit} isNewDraft={isNewDraft} />
      </main>
    </DetailPageTransition>
  );
}
