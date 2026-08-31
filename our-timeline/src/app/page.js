import Link from "next/link";
import Image from "next/image";
import { Camera, CirclePlus, MapPin, Sparkles } from "lucide-react";
import CountupClock from "@/components/CountupClock";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/dates";
import { getColorTagConfig } from "@/lib/colors";

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
    <div className="flex flex-1 justify-center bg-[#FAF7F2] px-4 pb-20">
      <main className="w-full max-w-2xl pt-10 sm:pt-14">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C85A32]">
            Stupid &amp; Kumar
          </p>
          <h1 className="mt-2 font-handwriting text-4xl font-bold tracking-tight text-[#2C2523] sm:text-6xl">
            Our Timeline
          </h1>
          <p className="mt-1 text-sm text-[#786F6A]">
            Every little adventure, laugh, and memory along the way.
          </p>
        </div>

        {/* Live count-up clock */}
        <CountupClock startDateIso={RELATIONSHIP_START_DATE.toISOString()} />

        {/* Action bar */}
        <div className="mt-12 flex items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#786F6A]">
              Memories
            </h2>
            <span className="rounded-full bg-[#EFE8DC] px-2.5 py-0.5 text-xs font-semibold text-[#5C534E]">
              {memories.length}
            </span>
          </div>

          <Link
            href="/memory/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#C85A32] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B34B24] active:scale-[0.98]"
          >
            <CirclePlus size={17} />
            <span>Add Memory</span>
          </Link>
        </div>

        {/* Vertical timeline */}
        {memories.length === 0 ? (
          <div className="mt-8 rounded-3xl border-2 border-dashed border-[#DFD6C9] bg-[#FFFDF9] p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDF2EC] text-[#C85A32]">
              <Sparkles size={24} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[#2C2523]">
              No memories yet
            </h3>
            <p className="mt-1 text-sm text-[#786F6A]">
              Tap &ldquo;Add Memory&rdquo; above to record your very first memory together!
            </p>
          </div>
        ) : (
          <ol className="relative mt-8 space-y-10 border-l-2 border-[#E8E2D9] pl-6 sm:pl-8">
            {memories.map((memory) => {
              const coverPhoto = memory.photo_urls?.[0];
              const colorConfig = getColorTagConfig(memory.color_tag);

              return (
                <li key={memory.id} className="relative">
                  {/* Dot on the timeline */}
                  <span
                    aria-hidden
                    className="absolute -left-[31px] sm:-left-[39px] top-6 h-4 w-4 rounded-full border-3 border-[#FAF7F2] shadow-xs"
                    style={{ backgroundColor: colorConfig.hex }}
                  />

                  {/* Polaroid-style Memory Card */}
                  <Link
                    href={`/memory/${memory.id}`}
                    className="group block rounded-3xl border border-[#E8E2D9] bg-[#FFFDF9] p-4 sm:p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#D8CEBF] hover:shadow-md"
                  >
                    {/* TOP OF POLAROID: Title & Date in Handwritten Font */}
                    <div className="pb-3 border-b border-[#F2ECE1]">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-handwriting text-2xl sm:text-3xl font-bold leading-tight text-[#2C2523] group-hover:text-[#C85A32] transition-colors">
                          {memory.title}
                        </h3>

                        <span
                          className="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold"
                          style={{
                            backgroundColor: colorConfig.bgLight,
                            color: colorConfig.text,
                            borderColor: colorConfig.border,
                          }}
                        >
                          #{memory.entry_number}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-handwriting text-lg sm:text-xl text-[#786F6A]">
                        <span>{formatDate(memory.date)}</span>
                        {memory.location && (
                          <span className="inline-flex items-center gap-1 text-sm font-sans text-[#8C827A]">
                            <MapPin size={13} className="text-[#C85A32]" />
                            {memory.location}
                          </span>
                        )}
                        {memory.chapter_tag && (
                          <span className="ml-auto rounded-full bg-[#FAF7F2] border border-[#E8E2D9] px-2.5 py-0.5 text-xs font-sans font-medium text-[#786F6A]">
                            {memory.chapter_tag}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PHOTO: Square-cropped cover photo directly below title/date */}
                    <div className="mt-4 relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F4EFE6] border border-[#EAE3D7]">
                      {coverPhoto ? (
                        <Image
                          src={coverPhoto}
                          alt={memory.title}
                          fill
                          sizes="(max-width: 640px) 100vw, 600px"
                          className="object-cover transition duration-300 group-hover:scale-[1.02]"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-[#A89F95]">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE8DC] text-[#786F6A]">
                            <Camera size={22} />
                          </div>
                          <span className="font-handwriting text-xl text-[#786F6A]">
                            No photo attached
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Short description story snippet */}
                    {memory.description && (
                      <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-[#5C534E]">
                        {memory.description}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}