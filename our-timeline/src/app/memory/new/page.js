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
    <div className="flex flex-1 justify-center bg-neutral-50 px-4 pb-16">
      <main className="w-full max-w-2xl pt-8">
        <nav className="text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium text-neutral-500 transition hover:text-neutral-800"
          >
            <ArrowLeft size={16} />
            Timeline
          </Link>
        </nav>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">New memory</h1>
        <MemoryForm mode="new" defaultEntryNumber={defaultEntryNumber} />
      </main>
    </div>
  );
}