"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDate } from "@/lib/dates";

// Snapshots of time in years / months / weeks / days / hours / minutes / seconds.
const UNITS = [
  ["years", "Y"],
  ["months", "MO"],
  ["weeks", "W"],
  ["days", "D"],
  ["hours", "HR"],
  ["minutes", "MIN"],
  ["seconds", "SEC"],
];

// Same calendar day-of-month `n` months from `start` (clamped to month end).
function addMonths(start, months) {
  const y = start.getFullYear();
  const m = start.getMonth() + months;
  return new Date(y, m, start.getDate());
}

// Calendar-aware breakdown from `start` up to `now`:
// years + months computed via the calendar; the leftover time is then
// expressed as weeks / days / hours / minutes / seconds.
function breakDown(start, now) {
  let months = 0;
  while (addMonths(start, months + 1) <= now) months += 1;

  const remaining = Math.max(0, now.getTime() - addMonths(start, months).getTime());
  const totalDays = Math.floor(remaining / 86400000);

  return {
    years: Math.floor(months / 12),
    months: months % 12,
    weeks: Math.floor(totalDays / 7),
    days: totalDays % 7,
    hours: Math.floor((remaining % 86400000) / 3600000),
    minutes: Math.floor((remaining % 3600000) / 60000),
    seconds: Math.floor((remaining % 60000) / 1000),
  };
}

// Live count-up clock. Ticks every second client-side and shows how long it's
// been since the start date prop.
export default function CountupClock({ startDateIso }) {
  const start = useMemo(() => new Date(startDateIso), [startDateIso]);
  const [parts, setParts] = useState(() => breakDown(start, new Date()));

  useEffect(() => {
    const timer = setInterval(() => setParts(breakDown(start, new Date())), 1000);
    return () => clearInterval(timer);
  }, [start]);

  return (
    <div className="mt-6">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {UNITS.map(([key, label]) => (
          <div
            key={key}
            className="rounded-xl border border-neutral-200 bg-white px-2 py-3 text-center shadow-sm"
          >
            <div className="font-mono text-lg font-semibold tabular-nums text-neutral-900 sm:text-xl">
              {String(parts[key]).padStart(2, "0")}
            </div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
              {label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs text-neutral-400">
        …and counting since <span className="font-medium text-neutral-500">{formatDate(startDateIso)}</span>
      </p>
    </div>
  );
}