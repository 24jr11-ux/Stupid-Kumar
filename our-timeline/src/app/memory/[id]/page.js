import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
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

export default async function MemoryPage({ params }) {
  const { id } = await params;
  const memory = await getMemory(id);

  if (!memory) notFound();

  return (
    <div className="flex flex-1 justify-center bg-[#FAF7F2] px-4 pb-20">
      <main className="w-full max-w-2xl pt-8 sm:pt-10">
        <nav className="flex items-center justify-between text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-[#FFFDF9] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#786F6A] shadow-2xs transition hover:border-[#D8CEBF] hover:text-[#2C2523]"
          >
            <ArrowLeft size={15} />
            Timeline
          </Link>
          <Link
            href={`/memory/${memory.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E2D9] bg-[#FFFDF9] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#786F6A] shadow-2xs transition hover:border-[#D8CEBF] hover:text-[#2C2523]"
          >
            <Pencil size={13} />
            Edit
          </Link>
        </nav>

        <MemoryDetail memory={memory} />
      </main>
    </div>
  );
}