"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addYears,
  addMonths,
  addDays,
  addHours,
  addMinutes,
  differenceInSeconds,
} from "date-fns";

// Placeholder breakdown shown before the first client tick so the server and
// initial client render stay in sync (hydrate without a mismatch).
const PLACEHOLDER = {
  years: 0,
  months: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

const MAIN_UNITS = [["years", "years"], ["months", "months"], ["days", "days"]];
const SMALL_UNITS = [["hours", "hours"], ["minutes", "minutes"], ["seconds", "seconds"]];

// Calendar-aware breakdown from `start` up to `now`.
function breakDown(start, now) {
  let cursor = start;
  let years = 0;
  while (true) {
    const next = addYears(cursor, 1);
    if (next > now) break;
    cursor = next;
    years += 1;
  }

  let months = 0;
  while (true) {
    const next = addMonths(cursor, 1);
    if (next > now) break;
    cursor = next;
    months += 1;
  }

  let days = 0;
  while (true) {
    const next = addDays(cursor, 1);
    if (next > now) break;
    cursor = next;
    days += 1;
  }

  let hours = 0;
  while (true) {
    const next = addHours(cursor, 1);
    if (next > now) break;
    cursor = next;
    hours += 1;
  }

  let minutes = 0;
  while (true) {
    const next = addMinutes(cursor, 1);
    if (next > now) break;
    cursor = next;
    minutes += 1;
  }

  const seconds = differenceInSeconds(now, cursor);

  return { years, months, days, hours, minutes, seconds };
}

// Live count-up clock.
export default function CountupClock({ startDateIso }) {
  const start = useMemo(() => new Date(startDateIso), [startDateIso]);
  const [now, setNow] = useState(null);

  const parts = useMemo(
    () => (now ? breakDown(start, now) : PLACEHOLDER),
    [start, now]
  );

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-7 text-center" role="timer" aria-label="Time together">
      <div className="mx-auto flex max-w-md items-baseline justify-center gap-3 sm:gap-6">
        {MAIN_UNITS.map(([key, label]) => (
          <div key={key} className="min-w-0 flex-1">
            <span className="block font-handwriting text-[clamp(2.8rem,13vw,5rem)] leading-none tabular-nums text-[#FAF7F2]">{parts[key]}</span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#F4EFE6] sm:text-xs">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-baseline justify-center gap-5 text-[#F4EFE6] sm:gap-8">
        {SMALL_UNITS.map(([key, label]) => (
          <span key={key} className="whitespace-nowrap text-xs sm:text-sm"><span className="font-mono text-base tabular-nums text-[#FAF7F2] sm:text-lg">{String(parts[key]).padStart(2, "0")}</span> {label}</span>
        ))}
      </div>
      <p className="mt-3 text-xs font-medium tracking-wide text-[#F4EFE6]">
        since April 5th, 2025
      </p>
    </div>
  );
}
