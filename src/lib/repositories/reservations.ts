import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { ClassScope, Reservation } from "@/types/domain";

export interface ReservationFilters {
  userId?: string | null;
  year?: string | null;
  grade?: string | null;
  classNum?: string | null;
}

export async function findReservations(filters: ReservationFilters) {
  const query: Record<string, unknown> = {};
  if (filters.userId) query.userId = filters.userId;
  if (filters.year) query.year = filters.year;
  if (filters.grade) query.grade = filters.grade;
  if (filters.classNum) query.class = filters.classNum;

  const db = await getDb();
  return db.collection<Reservation>("book").find(query).sort({ time: 1 }).toArray();
}

export async function createReservation(reservation: Reservation) {
  const db = await getDb();
  await db.collection<Reservation>("book").insertOne(reservation);
}

export async function deleteReservation(id: string) {
  const db = await getDb();
  return db.collection<Reservation>("book").deleteOne({ _id: new ObjectId(id) });
}

export async function findReservationsForClass(scope: ClassScope) {
  return findReservations({ year: scope.year, grade: scope.grade, classNum: scope.classNum });
}
