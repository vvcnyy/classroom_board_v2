import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { listActiveClasses } from "@/lib/repositories/classes";
import { findReservationsForClass } from "@/lib/repositories/reservations";
import { bulkUpdateStudentLocations } from "@/lib/repositories/students";
import { addVisibleSections } from "@/lib/repositories/visible-sections";
import type { ClassScope, PendingLocationUpdate } from "@/types/domain";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function processReservationReload(scope: ClassScope) {
  const now = dayjs().tz("Asia/Seoul");
  const currentDay = now.day().toString();
  const currentTime = now.format("HH:mm");
  const reservations = await findReservationsForClass(scope);
  const dueReservations = reservations.filter((reservation) => {
    const days = reservation.date.split(",").map((day) => day.trim());
    return days.includes(currentDay) && reservation.time === currentTime;
  });

  const updates: PendingLocationUpdate[] = dueReservations.map((reservation) => ({
    studentId: reservation.userId,
    location: reservation.place,
    etcContent: reservation.etcContent,
    timestamp: now.valueOf(),
  }));

  await Promise.all([
    bulkUpdateStudentLocations(scope, updates),
    addVisibleSections(scope, dueReservations.map((reservation) => reservation.place)),
  ]);

  return dueReservations;
}

export async function processAllReservationReloads() {
  const classes = await listActiveClasses();
  let processedClasses = 0;
  let totalBooks = 0;
  const touchedScopes: ClassScope[] = [];

  for (const classData of classes as ClassScope[]) {
    const reservations = await processReservationReload(classData);
    if (reservations.length > 0) {
      processedClasses += 1;
      totalBooks += reservations.length;
      touchedScopes.push(classData);
    }
  }

  return {
    processedClasses,
    totalBooks,
    touchedScopes,
    timestamp: dayjs().tz("Asia/Seoul").format("YYYY-MM-DD HH:mm:ss"),
  };
}
