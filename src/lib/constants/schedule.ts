import type { TimeKey } from "@/types/domain";

export interface TimeSlot {
  label: TimeKey;
  start: string;
  end: string;
}

export const WEEKDAY_ATTENDANCE_SCHEDULE: TimeSlot[] = [
  { label: "time1", start: "16:40", end: "17:50" },
  { label: "time2", start: "17:50", end: "18:35" },
  { label: "study1", start: "18:35", end: "21:10" },
  { label: "study2", start: "21:10", end: "23:00" },
];

export const WEEKEND_ATTENDANCE_SCHEDULE: TimeSlot[] = [
  { label: "study1", start: "18:00", end: "21:00" },
  { label: "study2", start: "21:00", end: "22:30" },
];

export function getAttendanceSchedule(dayOfWeek: number): TimeSlot[] {
  return dayOfWeek === 0 || dayOfWeek === 6 ? WEEKEND_ATTENDANCE_SCHEDULE : WEEKDAY_ATTENDANCE_SCHEDULE;
}

export function getCurrentAttendanceSlot(now: Date): TimeSlot | undefined {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return getAttendanceSchedule(now.getDay()).find((slot) => {
    const [startHour, startMinute] = slot.start.split(":").map(Number);
    const [endHour, endMinute] = slot.end.split(":").map(Number);
    return minutes >= startHour * 60 + startMinute && minutes < endHour * 60 + endMinute;
  });
}
