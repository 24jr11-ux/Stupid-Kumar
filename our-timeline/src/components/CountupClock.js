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

// Snapshots of time in years / months / days / hours / minutes / seconds.
const UNITS = [
  ["years", "YRS"],
  ["months", "MOS"],
  ["days", "DAYS"],
  ["hours", "HRS"],
  ["minutes", "MIN"],
  ["seconds", "SEC"],
];

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
// Solid opaque rich espresso cards with crisp glowing borders in accent orange.
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
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6 sm:gap-3">
        {UNITS.map(([key, label]) => (
          <div
            key={key}
            className="group relative rounded-2xl border border-[#C85A32]/45 bg-[#382722] px-2.5 py-3.5 text-center shadow-[0_6px_24px_rgba(0,0,0,0.45),0_0_14px_rgba(200,90,50,0.22)] transition-all duration-300 hover:border-[#C85A32] hover:shadow-[0_8px_30px_rgba(0,0,0,0.55),0_0_22px_rgba(200,90,50,0.4)] hover:-translate-y-0.5"
          >
            <div className="font-mono text-2xl font-bold tabular-nums text-[#FAF7F2] drop-shadow-xs sm:text-3xl">
              {String(parts[key]).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[11px] font-semibold tracking-wider text-[#D4C8BA]">
              {label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3.5 text-center text-xs font-medium tracking-wide text-[#D4C8BA]">
        …and counting every moment together since April 5th, 2025
      </p>
    </div>
  );
}