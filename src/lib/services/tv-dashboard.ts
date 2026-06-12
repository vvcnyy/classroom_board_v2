import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { getAttendance } from "@/lib/repositories/attendance";
import { logBulkLocationUpdates } from "@/lib/repositories/logs";
import { getSections } from "@/lib/repositories/sections";
import { bulkUpdateStudentLocations, findStudents } from "@/lib/repositories/students";
import { getVisibleSections } from "@/lib/repositories/visible-sections";
import type { ClassScope, PendingLocationUpdate } from "@/types/domain";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function getTvSnapshot(scope: ClassScope) {
  const today = dayjs().tz("Asia/Seoul").format("YYYY-MM-DD");
  const [students, visibleSections, attendanceData, sectionsData] = await Promise.all([
    findStudents({ year: scope.year, grade: scope.grade, classNum: scope.classNum }),
    getVisibleSections(scope),
    getAttendance(scope, today),
    getSections(scope),
  ]);

  return {
    students,
    visibleSections,
    attendanceData,
    sectionsData,
  };
}

export async function applyTvUpdates(scope: ClassScope, updates: PendingLocationUpdate[]) {
  const validUpdates = updates.filter((update) => update.studentId && update.location);
  await bulkUpdateStudentLocations(scope, validUpdates);
  await logBulkLocationUpdates(scope, validUpdates);
}
