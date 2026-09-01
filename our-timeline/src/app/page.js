import Link from "next/link";
import Image from "next/image";
import { Camera, Sparkles } from "lucide-react";
import CountupClock from "@/components/CountupClock";
import AddMemoryButton from "@/components/AddMemoryButton";
import { supabase } from "@/lib/supabase";
import { getColorTagConfig } from "@/lib/colors";

// Date formats for the polaroid card. mm/dd/yy on the top band.
function polaroidTopDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

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
          <h1 className="font-handwriting text-4xl font-bold tracking-tight text-[#2C2523] sm:text-6xl">
            Stupid &amp; Kumar
          </h1>
        </div>

        {/* Live count-up clock */}
        <CountupClock startDateIso={RELATIONSHIP_START_DATE.toISOString()} />

        {/* Action bar */}
        <div className="mt-12 flex items-center justify-between gap-4 border-b border-[#E8E2D9] pb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#786F6A]">
            Memories
          </h2>

          <AddMemoryButton />
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
              // The cover is the photo the user explicitly picked (if its URL is
              // still in the photo list); otherwise fall back to the first photo.
              const photos = memory.photo_urls ?? [];
              const pickedCover = memory.cover_photo_url;
              const coverPhoto =
                photos.includes(pickedCover) ? pickedCover : photos[0];
              const coverPos =
                typeof memory.cover_photo_position === "object" &&
                memory.cover_photo_position !== null
                  ? (memory.cover_photo_position.x ?? 50) +
                    "% " +
                    (memory.cover_photo_position.y ?? 50) +
                    "%"
                  : "50% 50%";
              const colorConfig = getColorTagConfig(memory.color_tag);

              return (
                <li key={memory.id} className="relative">
                  {/* Dot on the timeline */}
                  <span
                    aria-hidden
                    className="absolute -left-[31px] sm:-left-[39px] top-10 h-4 w-4 rounded-full border-3 border-[#FAF7F2] shadow-xs"
                    style={{ backgroundColor: colorConfig.hex }}
                  />

                  {/* -----------------------------------------------------
                      POLAROID CARD
                      A real polaroid: white/off-white frame, square corners
                      (no border-radius on this component), a top band with
                      the mm/dd/yy date, a square cover photo in the middle,
                      and a handwritten caption band at the bottom. Clicking
                      the whole card opens that entry's detail page.
                      ----------------------------------------------------- */}
                  <Link
                    href={`/memory/${memory.id}`}
                    className="group mx-auto block max-w-sm bg-[#FDFBF6] p-3 pb-5 shadow-[0_1px_2px_rgba(44,37,35,0.12),0_8px_24px_-8px_rgba(44,37,35,0.2)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(44,37,35,0.16),0_14px_34px_-8px_rgba(44,37,35,0.28)]"
                  >
                    {/* TOP BAND: calendar date, mm/dd/yy */}
                    <div className="px-1.5 pb-2.5 pt-1 text-center font-mono text-sm font-semibold tracking-[0.18em] text-[#786F6A]">
                      {polaroidTopDate(memory.date)}
                    </div>

                    {/* MIDDLE: square-cropped cover photo */}
                    <div className="relative aspect-square w-full overflow-hidden bg-[#EFE8DC]">
                      {coverPhoto ? (
                        <Image
                          src={coverPhoto}
                          alt={memory.title}
                          fill
                          sizes="(max-width: 640px) 80vw, 400px"
                          style={{ objectPosition: coverPos }}
                          className="object-cover transition duration-300 group-hover:scale-[1.03]"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center text-[#A89F95]">
                          <div className="flex h-12 w-12 items-center justify-center bg-[#F1E9DC] text-[#A08F7F]">
                            <Camera size={22} />
                          </div>
                          <span className="font-handwriting text-xl text-[#9E8E7F]">
                            No photo yet
                          </span>
                        </div>
                      )}
                    </div>

                    {/* BOTTOM BAND: handwritten caption — the Date Title */}
                    <div
                      className="px-1.5 pt-3 text-center font-handwriting text-2xl font-bold leading-tight text-[#2C2523] transition-colors group-hover:text-[#C85A32]"
                      style={{ fontFamily: "var(--font-handwriting)" }}
                    >
                      {memory.title || "Untitled"}
                    </div>
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