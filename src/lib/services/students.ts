import { HttpError } from "@/lib/api/http";
import { CLASSROOM_SECTION } from "@/lib/constants/sections";
import { logLocationUpdate } from "@/lib/repositories/logs";
import { getSections } from "@/lib/repositories/sections";
import {
  createStudent,
  deleteStudent,
  findStudents,
  resetStudentLocations,
  updateStudentLocation,
} from "@/lib/repositories/students";
import { getVisibleSections, setVisibleSections } from "@/lib/repositories/visible-sections";
import type { ClassScope } from "@/types/domain";

export async function createClassStudent(scope: ClassScope, id: string, name = "") {
  if (!id) {
    throw new HttpError(400, "번호를 입력해주세요.", "MISSING_STUDENT_ID");
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId < 0 || numericId > 99) {
    throw new HttpError(400, "번호는 0부터 99 사이여야 합니다.", "INVALID_STUDENT_ID");
  }

  const studentId = `${scope.grade}${scope.classNum}${String(numericId).padStart(2, "0")}`;
  const existing = await findStudents({ id: studentId, year: scope.year, grade: scope.grade, classNum: scope.classNum });
  if (existing.length > 0) {
    throw new HttpError(400, "이미 존재하는 학생입니다.", "STUDENT_EXISTS");
  }

  return createStudent({
    id: studentId,
    year: scope.year,
    grade: scope.grade,
    class: scope.classNum,
    name,
    number: numericId,
    location: CLASSROOM_SECTION.key,
  });
}

export async function updateLocationAndVisibility(input: {
  scope: ClassScope;
  id: string;
  location: string;
  etcContent?: string;
  itf?: string | null;
}) {
  const { scope, id, location, etcContent, itf } = input;
  if (!id || !location) {
    throw new HttpError(400, "학생과 위치를 확인해주세요.", "MISSING_FIELDS");
  }

  const result = await updateStudentLocation(scope, id, location, etcContent);
  const visible = await getVisibleSections(scope);
  if (!visible.includes(location)) {
    await setVisibleSections(scope, [...visible, location]);
  }

  await logLocationUpdate(scope, id, location, etcContent, itf);
  return { ok: true, modifiedCount: result.modifiedCount, location };
}

export async function deleteClassStudent(scope: ClassScope, id: string) {
  const result = await deleteStudent(scope, id);
  if (result.deletedCount === 0) {
    throw new HttpError(404, "학생을 찾을 수 없습니다.", "STUDENT_NOT_FOUND");
  }
  return { ok: true };
}

export async function resetClassStudents(scope: ClassScope) {
  const result = await resetStudentLocations(scope);
  return { ok: true, modifiedCount: result.modifiedCount };
}

export async function getStudentAppData(input: { id: string; year: string; grade: string; classNum: string }) {
  const [student, reservations, sections] = await Promise.all([
    findStudents(input),
    import("@/lib/repositories/reservations").then((repo) =>
      repo.findReservations({ userId: input.id, year: input.year, grade: input.grade, classNum: input.classNum })
    ),
    getSections(input),
  ]);

  if (!student[0] || student[0].name === "") {
    throw new HttpError(403, "Unauthorized", "UNAUTHORIZED_STUDENT");
  }

  return { student, book: reservations, sections };
}
