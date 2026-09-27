import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MemoryDetail from "@/components/MemoryDetail";
import MemoryTransitionLink from "@/components/MemoryTransitionLink";
import { readMemories } from "@/lib/memories";
import { memoryColorHex, memoryColorIsLight } from "@/lib/colors";

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
    <div
      className={`memory-detail-page min-h-screen flex flex-1 justify-center px-4 pb-24 ${
        memoryColorIsLight(memory.color_tag) ? "memory-detail-page--light" : ""
      }`}
      data-memory-page={memory.id}
      style={{ backgroundColor: memoryColorHex(memory.color_tag) }}
    >
      <main className="relative z-10 w-full max-w-2xl pt-8 sm:pt-10">
        <nav className="text-sm">
          <MemoryTransitionLink
            href="/"
            targetSelector={`[data-memory-card="${memory.id}"]`}
            className="inline-flex items-center gap-2 rounded-full border border-[#5D433C] bg-[#382722] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#D4C8BA] shadow-md transition hover:border-[#C85A32] hover:text-[#FAF7F2]"
          >
            <ArrowLeft size={15} />
            Timeline
          </MemoryTransitionLink>
        </nav>

        <MemoryDetail memory={memory} initialEdit={initialEdit} isNewDraft={isNewDraft} />
      </main>
    </div>
  );
}
