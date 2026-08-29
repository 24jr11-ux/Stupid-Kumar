import Link from "next/link";
import { CirclePlus } from "lucide-react";
import CountupClock from "@/components/CountupClock";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/dates";

// ------------------------------------------------------------------
// When "we" began — edit this one constant and the count-up clock starts
// somewhere new. (Personal dates belong here, nothing hardcoded elsewhere.)
// ------------------------------------------------------------------
const RELATIONSHIP_START_DATE = new Date("2025-04-05T23:30:00-07:00");

// Always render fresh on each request so new memories appear immediately.
export const dynamic = "force-dynamic";

async function getMemories() {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .order("entry_number", { ascending: false }) // newest entry first
    .limit(500);

  if (error) {
    console.error("Failed to load memories:", error?.message);
    return [];
  }
  return data ?? [];
}

export default async function Home() {
  const memories = await getMemories();

  return (
    <div className="flex flex-1 justify-center bg-neutral-50 px-4 pb-16">
      <main className="w-full max-w-2xl pt-10 sm:pt-14">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
            Stupid &amp; Kumar
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Our Timeline
          </h1>
        </div>

        {/* Live count-up clock */}
        <CountupClock startDateIso={RELATIONSHIP_START_DATE.toISOString()} />

        {/* Add a memory */}
        <div className="mt-10 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Memories
          </h2>
          <Link
            href="/memory/new"
            className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700"
          >
            <CirclePlus size={16} />
            Add Memory
          </Link>
        </div>

        {/* Vertical timeline */}
        {memories.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
            <p className="text-sm text-neutral-500">
              No memories yet. Add the first one above — it all flows through the form, nothing is
              hardcoded.
            </p>
            <p className="mt-2 text-xs text-neutral-400">
              Remember to fill in <code>.env.local</code> and run{" "}
              <code>schema.sql</code> on your Supabase project.
            </p>
          </div>
        ) : (
          <ol className="relative mt-6 space-y-6 border-l border-neutral-200 pl-6">
            {memories.map((memory) => (
              <li key={memory.id} className="relative">
                {/* Dot on the line */}
                <span
                  aria-hidden
                  className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-neutral-900 shadow ring-1 ring-neutral-300"
                />
                <Link
                  href={`/memory/${memory.id}`}
                  className="group block rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-xs text-neutral-400">
                      #{memory.entry_number}
                    </span>
                    {memory.chapter_tag && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                        {memory.chapter_tag}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-neutral-400">
                      {formatDate(memory.date)}
                    </span>
                  </div>

                  <h3 className="mt-1 text-lg font-semibold text-neutral-900 group-hover:text-neutral-600">
                    {memory.title}
                  </h3>

                  {memory.location && (
                    <p className="mt-0.5 text-sm text-neutral-500">📍 {memory.location}</p>
                  )}

                  {memory.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-600">
                      {memory.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}