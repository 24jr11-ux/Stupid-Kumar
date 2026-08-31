import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import MemoryForm from "@/components/MemoryForm";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Next entry number = highest existing + 1, so memories keep counting up.
async function nextEntryNumber() {
  const { data, error } = await supabase
    .from("memories")
    .select("entry_number")
    .order("entry_number", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Failed to read next entry number:", error?.message);
    return 1;
  }
  return (data?.[0]?.entry_number ?? 0) + 1;
}

export default async function NewMemoryPage() {
  const defaultEntryNumber = await nextEntryNumber();

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
        <h1 className="mt-5 font-handwriting text-4xl font-bold tracking-tight text-[#2C2523]">
          New Memory
        </h1>
        <MemoryForm mode="new" defaultEntryNumber={defaultEntryNumber} />
      </main>
    </div>
  );
}