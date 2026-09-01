import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import MemoryDetail from "@/components/MemoryDetail";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getMemory(id) {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load memory:", error?.message);
    return null;
  }
  return data;
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
    <div className="flex flex-1 justify-center bg-[#FAF7F2] px-4 pb-20">
      <main className="w-full max-w-2xl pt-8 sm:pt-10">
        <nav className="text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-[#FFFDF9] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#786F6A] shadow-2xs transition hover:border-[#D8CEBF] hover:text-[#2C2523]"
          >
            <ArrowLeft size={15} />
            Timeline
          </Link>
        </nav>

        <MemoryDetail memory={memory} initialEdit={initialEdit} isNewDraft={isNewDraft} />
      </main>
    </div>
  );
}