export const RESERVATION_DAYS = [
  ["0", "일"],
  ["1", "월"],
  ["2", "화"],
  ["3", "수"],
  ["4", "목"],
  ["5", "금"],
  ["6", "토"],
] as const;

const reservationDayLabels = new Map(RESERVATION_DAYS);

export const RESERVATION_TIME_OPTIONS = Array.from({ length: 24 * 12 }, (_, index) => {
  const hour = String(Math.floor(index / 12)).padStart(2, "0");
  const minute = String((index % 12) * 5).padStart(2, "0");
  return `${hour}:${minute}`;
});

export function formatReservationDate(value: unknown) {
  return String(value ?? "")
    .split(",")
    .map((day) => day.trim())
    .filter(Boolean)
    .map((day) => reservationDayLabels.get(day as (typeof RESERVATION_DAYS)[number][0]) ?? day)
    .join(", ");
}
