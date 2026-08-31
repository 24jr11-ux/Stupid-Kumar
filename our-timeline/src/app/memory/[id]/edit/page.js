import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import MemoryForm from "@/components/MemoryForm";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function EditMemoryPage({ params }) {
  const { id } = await params;

  const { data: memory, error } = await supabase
    .from("memories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load memory for editing:", error?.message);
  }
  if (!memory) notFound();

  return (
    <div className="flex flex-1 justify-center bg-[#FAF7F2] px-4 pb-20">
      <main className="w-full max-w-2xl pt-8 sm:pt-10">
        <nav className="text-sm">
          <Link
            href={`/memory/${memory.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-[#FFFDF9] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#786F6A] shadow-2xs transition hover:border-[#D8CEBF] hover:text-[#2C2523]"
          >
            <ArrowLeft size={15} />
            Back to memory
          </Link>
        </nav>
        <h1 className="mt-5 font-handwriting text-4xl font-bold tracking-tight text-[#2C2523]">
          Edit Memory
        </h1>
        <MemoryForm mode="edit" memory={memory} memoryId={memory.id} />
      </main>
    </div>
  );
}