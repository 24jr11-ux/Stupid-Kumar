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
    <div className="scrapbook-label countup-card mx-auto mt-7 max-w-md px-4 py-5 text-center sm:px-8 sm:py-6" role="timer" aria-label="Time together">
      <div className="grid grid-cols-3 items-baseline gap-3 sm:gap-6">
        {MAIN_UNITS.map(([key, label]) => (
          <div key={key} className="min-w-0 flex-1">
            <span className="block font-handwriting text-[clamp(2.8rem,13vw,5rem)] leading-none tabular-nums">{parts[key]}</span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-xs">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#6B4E31]/20 pt-4 sm:gap-6">
        {SMALL_UNITS.map(([key, label]) => (
          <div key={key} className="min-w-0">
            <span className="block font-mono text-xl tabular-nums sm:text-2xl">{String(parts[key]).padStart(2, "0")}</span>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.1em] sm:text-xs">{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs font-medium tracking-wide">
        since April 5th, 2025
      </p>
    </div>
  );
}
