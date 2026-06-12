import { HttpError } from "@/lib/api/http";
import { createClass, classExists } from "@/lib/repositories/classes";
import { setSections } from "@/lib/repositories/sections";
import { createStudents } from "@/lib/repositories/students";
import { setVisibleSections } from "@/lib/repositories/visible-sections";
import { CLASSROOM_SECTION } from "@/lib/constants/sections";
import { DEFAULT_SECTIONS } from "@/lib/constants/sections";

function generatePassword(length = 16) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return value;
}

export async function createClassWithDefaults(input: { year?: string; grade?: string; classNum?: string; studentCount?: number }) {
  const { year, grade, classNum } = input;
  const studentCount = Number(input.studentCount ?? 0);
  if (!year || !grade || !classNum) {
    throw new HttpError(400, "학년도, 학년, 학급을 모두 입력해주세요.", "MISSING_FIELDS");
  }

  if (!Number.isInteger(studentCount) || studentCount < 0 || studentCount > 99) {
    throw new HttpError(400, "학생 수는 0부터 99 사이의 정수여야 합니다.", "INVALID_STUDENT_COUNT");
  }

  if (await classExists(year, grade, classNum)) {
    throw new HttpError(400, "이미 존재하는 학급입니다.", "CLASS_EXISTS");
  }

  const password = generatePassword();
  const classDoc = await createClass({
    year,
    grade,
    classNum,
    password,
    disabled: false,
    createdAt: new Date(),
  });

  const scope = { year, grade, classNum };
  const students = Array.from({ length: studentCount }, (_, index) => {
    const number = index + 1;
    return {
      id: `${grade}${classNum}${String(number).padStart(2, "0")}`,
      year,
      grade,
      class: classNum,
      name: "",
      number,
      location: CLASSROOM_SECTION.key,
    };
  });

  await Promise.all([
    setSections(scope, DEFAULT_SECTIONS),
    setVisibleSections(scope, ["classroom"]),
    createStudents(students),
  ]);

  return {
    success: true,
    class: {
      year: classDoc.year,
      grade: classDoc.grade,
      classNum: classDoc.classNum,
      password: classDoc.password,
      studentCount,
    },
  };
}
