"use client";

import { useEffect, useState } from "react";
import type { ScheduleEvent } from "@/types/domain";

export function DDay({ grade }: { grade: string }) {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!grade) return;
    fetch(`/api/schedule?grade=${grade}`)
      .then((response) => response.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]));
  }, [grade]);

  useEffect(() => {
    if (events.length === 0) return;
    const interval = window.setInterval(() => setIndex((value) => (value + 1) % events.length), 10000);
    return () => window.clearInterval(interval);
  }, [events.length]);

  if (events.length === 0) {
    return <div className="flex h-2/3 w-4/5 items-center justify-center rounded-[0.5vw] bg-zinc-900 text-white">로딩 중...</div>;
  }

  const event = events[index];
  const diffDays = Math.ceil((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="flex h-2/3 w-4/5 flex-col items-center justify-center rounded-[0.5vw] bg-zinc-900 p-[1.05vw] text-center text-white">
      <p className="text-[1.6vw]">{event.name}</p>
      <p className="text-[2.2vw] font-bold">{diffDays > 0 ? `D-${diffDays}` : diffDays < 0 ? `D+${Math.abs(diffDays)}` : "D-DAY"}</p>
    </div>
  );
}
