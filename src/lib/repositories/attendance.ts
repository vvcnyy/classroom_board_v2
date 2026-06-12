import { getDb } from "@/lib/db/mongodb";
import type { AttendanceCheck, ClassScope } from "@/types/domain";

export async function getAttendance(scope: ClassScope, date: string) {
  const db = await getDb();
  return db.collection<AttendanceCheck>("attendance_check").findOne({
    date,
    year: scope.year,
    grade: scope.grade,
    class: scope.classNum,
  });
}

export async function listAttendanceDates(scope: ClassScope) {
  const db = await getDb();
  const docs = await db
    .collection<AttendanceCheck>("attendance_check")
    .find({ year: scope.year, grade: scope.grade, class: scope.classNum })
    .sort({ date: -1 })
    .project({ _id: 0, date: 1 })
    .toArray();
  return docs;
}

export async function upsertAttendance(scope: ClassScope, data: AttendanceCheck) {
  const db = await getDb();
  return db.collection<AttendanceCheck>("attendance_check").updateOne(
    { date: data.date, year: scope.year, grade: scope.grade, class: scope.classNum },
    { $set: { ...data, year: scope.year, grade: scope.grade, class: scope.classNum } },
    { upsert: true }
  );
}
