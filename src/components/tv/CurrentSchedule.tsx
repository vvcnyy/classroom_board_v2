"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = { label: string; start: string; end: string };

const weekday: Slot[] = [
  { label: "취침시간", start: "00:00", end: "06:30" },
  { label: "아침시간", start: "06:30", end: "08:15" },
  { label: "아침 자율학습", start: "08:15", end: "08:50" },
  { label: "조회", start: "08:50", end: "09:00" },
  { label: "1교시", start: "09:00", end: "09:50" },
  { label: "쉬는시간", start: "09:50", end: "10:00" },
  { label: "2교시", start: "10:00", end: "10:50" },
  { label: "쉬는시간", start: "10:50", end: "11:00" },
  { label: "3교시", start: "11:00", end: "11:50" },
  { label: "쉬는시간", start: "11:50", end: "12:00" },
  { label: "4교시", start: "12:00", end: "12:50" },
  { label: "점심시간", start: "12:50", end: "13:50" },
  { label: "5교시", start: "13:50", end: "14:40" },
  { label: "쉬는시간", start: "14:40", end: "14:50" },
  { label: "6교시", start: "14:50", end: "15:40" },
  { label: "쉬는시간", start: "15:40", end: "15:50" },
  { label: "7교시", start: "15:50", end: "16:40" },
  { label: "청소시간", start: "16:40", end: "17:00" },
  { label: "종례", start: "17:00", end: "17:10" },
  { label: "방과후 1타임", start: "17:10", end: "17:50" },
  { label: "쉬는시간", start: "17:50", end: "17:55" },
  { label: "방과후 2타임", start: "17:55", end: "18:35" },
  { label: "저녁시간", start: "18:35", end: "19:50" },
  { label: "야간 자율학습 1타임", start: "19:50", end: "21:10" },
  { label: "쉬는시간", start: "21:10", end: "21:30" },
  { label: "야간 자율학습 2타임", start: "21:30", end: "23:00" },
  { label: "개인정비시간", start: "23:00", end: "24:00" },
];

const weekend: Slot[] = [
  { label: "취침시간", start: "00:00", end: "07:00" },
  { label: "아침 시간", start: "07:00", end: "09:00" },
  { label: "1차 자율학습", start: "09:00", end: "10:20" },
  { label: "쉬는시간", start: "10:20", end: "10:40" },
  { label: "2차 자율학습", start: "10:40", end: "12:00" },
  { label: "점심 식사 및 휴식", start: "12:00", end: "14:00" },
  { label: "3차 자율학습", start: "14:00", end: "16:00" },
  { label: "쉬는시간", start: "16:00", end: "16:30" },
  { label: "4차 자율학습", start: "16:30", end: "18:00" },
  { label: "저녁 식사 및 휴식", start: "18:00", end: "20:00" },
  { label: "5차 자율학습", start: "20:00", end: "21:00" },
  { label: "쉬는시간", start: "21:00", end: "21:20" },
  { label: "6차 자율학습", start: "21:20", end: "22:30" },
  { label: "개인정비시간", start: "22:30", end: "24:00" },
];

const gradeEndTimes = {
  weekdayStudy2: {
    "1": "22:50",
    "2": "23:00",
    "3": "23:10",
  },
  weekendStudy6: {
    "1": "22:20",
    "2": "22:30",
    "3": "22:40",
  },
} as const;

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function scheduleForGrade(base: Slot[], grade: string, isWeekend: boolean): Slot[] {
  const studyLabel = isWeekend ? "6차 자율학습" : "야간 자율학습 2타임";
  const endTimeMap = isWeekend ? gradeEndTimes.weekendStudy6 : gradeEndTimes.weekdayStudy2;
  const endTime = endTimeMap[grade as keyof typeof endTimeMap];

  if (!endTime) return base;

  return base.map((slot) => {
    if (slot.label === studyLabel) {
      return { ...slot, end: endTime };
    }

    if (slot.label === "개인정비시간") {
      return { ...slot, start: endTime };
    }

    return slot;
  });
}

export function CurrentSchedule({ grade }: { grade: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const current = useMemo(() => {
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const list = scheduleForGrade(isWeekend ? weekend : weekday, grade, isWeekend);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return list.find((slot) => currentMinutes >= minutes(slot.start) && currentMinutes < minutes(slot.end));
  }, [grade, now]);

  const progress = current
    ? ((now.getHours() * 60 + now.getMinutes() - minutes(current.start)) / (minutes(current.end) - minutes(current.start))) * 100
    : 0;

  return (
    <div className="flex w-3/4 flex-col items-center justify-center p-[1.05vw]">
      <div className="mb-[1.05vw] text-[2vw] font-bold">{current?.label ?? "현재 시간표 없음"}</div>
      <div className="flex w-full items-center justify-between px-[0.2vw] text-[1vw]">
        <span>{current?.start ?? "00:00"}</span>
        <span>{current?.end ?? "00:00"}</span>
      </div>
      <div className="h-[4vh] w-full overflow-hidden rounded-full bg-zinc-900">
        <div className="h-full bg-zinc-600" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
