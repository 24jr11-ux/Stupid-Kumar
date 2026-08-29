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
    <div className="flex flex-1 justify-center bg-neutral-50 px-4 pb-16">
      <main className="w-full max-w-2xl pt-8">
        <nav className="text-sm">
          <Link
            href={`/memory/${memory.id}`}
            className="inline-flex items-center gap-1.5 font-medium text-neutral-500 transition hover:text-neutral-800"
          >
            <ArrowLeft size={16} />
            Back to memory
          </Link>
        </nav>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">Edit memory</h1>
        <MemoryForm mode="edit" memory={memory} memoryId={memory.id} />
      </main>
    </div>
  );
}