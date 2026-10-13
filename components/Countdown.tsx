"use client";

import { useEffect, useState } from "react";

// 24 Oct 2026, 6:30 pm IST
const TARGET = new Date("2026-10-24T18:30:00+05:30").getTime();

function parts(ms: number) {
  const t = Math.max(0, ms);
  return {
    Days: Math.floor(t / 86_400_000),
    Hours: Math.floor(t / 3_600_000) % 24,
    Minutes: Math.floor(t / 60_000) % 60,
    Seconds: Math.floor(t / 1000) % 60,
  };
}

export default function Countdown() {
  const [left, setLeft] = useState<ReturnType<typeof parts> | null>(null);

  useEffect(() => {
    const tick = () => setLeft(parts(TARGET - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="countdown" role="timer" aria-label="Countdown to the wedding">
      {(["Days", "Hours", "Minutes", "Seconds"] as const).map((label) => (
        <div className="countdown__cell" key={label}>
          <span className="countdown__num">{left ? String(left[label]).padStart(2, "0") : "--"}</span>
          <span className="countdown__label">{label}</span>
        </div>
      ))}
    </div>
  );
}
