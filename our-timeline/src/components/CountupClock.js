"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addYears,
  addMonths,
  addWeeks,
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
  weeks: 0,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

// Snapshots of time in years / months / weeks / days / hours / minutes / seconds.
const UNITS = [
  ["years", "YRS"],
  ["months", "MOS"],
  ["weeks", "WKS"],
  ["days", "DAYS"],
  ["hours", "HRS"],
  ["minutes", "MIN"],
  ["seconds", "SEC"],
];

// Calendar-aware breakdown from `start` up to `now`. Each unit is subtracted
// sequentially (years first, then months, weeks, ... seconds) so that differing
// month lengths and timezone/DST shifts are handled precisely by date-fns.
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

  let weeks = 0;
  while (true) {
    const next = addWeeks(cursor, 1);
    if (next > now) break;
    cursor = next;
    weeks += 1;
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

  return { years, months, weeks, days, hours, minutes, seconds };
}

// Live count-up clock. Ticks every second client-side and shows how long it's
// been since the start date prop.
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
    <div className="mt-8">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {UNITS.map(([key, label]) => (
          <div
            key={key}
            className="rounded-2xl border border-[#E8E2D9] bg-[#FFFDF9] px-2.5 py-3 text-center shadow-xs transition hover:border-[#D8CEBF]"
          >
            <div className="font-mono text-xl font-bold tabular-nums text-[#C85A32] sm:text-2xl">
              {String(parts[key]).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[10px] font-semibold tracking-wider text-[#8C827A]">
              {label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs font-medium text-[#8C827A]">
        …and counting our moments together since April 5th, 2025
      </p>
    </div>
  );
}