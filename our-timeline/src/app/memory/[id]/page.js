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
    <div className="flex flex-1 justify-center bg-neutral-50 px-4 pb-16">
      <main className="w-full max-w-2xl pt-8">
        <nav className="flex items-center justify-between text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium text-neutral-500 transition hover:text-neutral-800"
          >
            <ArrowLeft size={16} />
            Timeline
          </Link>
          <Link
            href={`/memory/${memory.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:text-neutral-900"
          >
            <Pencil size={14} />
            Edit
          </Link>
        </nav>

        <MemoryDetail memory={memory} />
      </main>
    </div>
  );
}