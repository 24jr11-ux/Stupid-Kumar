import Link from "next/link";
import Image from "next/image";
import { Camera, Sparkles } from "lucide-react";
import CountupClock from "@/components/CountupClock";
import AddMemoryButton from "@/components/AddMemoryButton";
import AnimatedBackground from "@/components/AnimatedBackground";
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
    <div className="min-h-screen flex flex-1 justify-center px-4 pb-24">
      <AnimatedBackground />

      <main className="relative z-10 w-full max-w-2xl pt-12 sm:pt-16">
        {/* Header Hero */}
        <div className="text-center">
          <h1
            className="font-handwriting text-5xl font-bold tracking-tight text-[#FAF7F2] sm:text-7xl transition-all"
            style={{
              textShadow: "0 0 32px rgba(200, 90, 50, 0.4), 0 2px 8px rgba(0, 0, 0, 0.5)",
            }}
          >
            Stupid &amp; Kumar
          </h1>
          <p className="mt-2 text-sm font-medium tracking-wide text-[#D4C8BA]">
            Our private keepsake of favorite moments and dates.
          </p>
        </div>

        {/* Live count-up clock on solid glowing espresso cards */}
        <CountupClock startDateIso={RELATIONSHIP_START_DATE.toISOString()} />

        {/* Action bar */}
        <div className="mt-14 flex items-center justify-between gap-4 border-b border-[#5D433C] pb-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#D4C8BA]">
              Memories
            </h2>
            <span className="rounded-full bg-[#382722] px-2.5 py-0.5 text-xs font-semibold text-[#FAF7F2] border border-[#5D433C]">
              {memories.length}
            </span>
          </div>

          <AddMemoryButton />
        </div>

        {/* Vertical timeline */}
        {memories.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-[#5D433C] bg-[#382722] p-12 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C85A32]/20 text-[#F8B79D] border border-[#C85A32]/40">
              <Sparkles size={24} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[#FAF7F2]">
              No memories yet
            </h3>
            <p className="mt-1 text-sm text-[#D4C8BA]">
              Tap &ldquo;Add Memory&rdquo; above to record your very first date together!
            </p>
          </div>
        ) : (
          <ol className="relative mt-10 space-y-12 border-l-2 border-[#5D433C] pl-6 sm:pl-8">
            {memories.map((memory) => {
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
                  {/* Glowing dot on the timeline */}
                  <span
                    aria-hidden="true"
                    className="absolute -left-[31px] sm:-left-[39px] top-10 h-4 w-4 rounded-full border-2 border-[#4A352F]"
                    style={{
                      backgroundColor: colorConfig.hex,
                      boxShadow: `0 0 14px ${colorConfig.hex}90`,
                    }}
                  />

                  {/* -----------------------------------------------------
                      POLAROID CARD
                      Crisp white/cream frame with sharp corners.
                      Solid opaque surface that pops against the vibrant background!
                      ----------------------------------------------------- */}
                  <Link
                    href={`/memory/${memory.id}`}
                    className="group mx-auto block max-w-sm bg-[#FDFBF6] p-3 pb-5 shadow-[0_8px_30px_rgba(0,0,0,0.5),0_1px_3px_rgba(0,0,0,0.2)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_38px_rgba(0,0,0,0.65)]"
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
                      className="px-1.5 pt-3.5 text-center font-handwriting text-2xl font-bold leading-tight text-[#2C2523] transition-colors group-hover:text-[#C85A32]"
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