import { cookies } from "next/headers";
import { fail, ok, requireParam } from "@/lib/api/http";
import { getClassCode, getClassNum, getStudentId, getStudentIdFromBody, getStudentNumberFromBody } from "@/lib/api/params";
import { logAccess } from "@/lib/repositories/logs";
import { publishClassChanged } from "@/lib/realtime/publish";
import { findStudents } from "@/lib/repositories/students";
import { requireClassByPassword } from "@/lib/services/auth";
import { createClassStudent, deleteClassStudent } from "@/lib/services/students";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = getStudentId(searchParams);
    const name = searchParams.get("name");

    let year = searchParams.get("year");
    let grade = searchParams.get("grade");
    let classNum = getClassNum(searchParams);

    if (!id || !name) {
      const scope = await requireClassByPassword(getClassCode(searchParams));
      year = scope.year;
      grade = scope.grade;
      classNum = scope.classNum;
    }

    const students = await findStudents({ id, name, year, grade, classNum });
    const itf = (await cookies()).get("itf")?.value;
    if (itf) {
      await logAccess({ action: "GET", api: "/api/students", id, year, grade, class: classNum, name, itf });
    }

    return ok(students);
  } catch (error) {
    return fail(error, "Failed to fetch students");
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    const body = await req.json();
    const student = await createClassStudent(scope, getStudentNumberFromBody(body) ?? "", String(body.name ?? ""));
    publishClassChanged(scope, "student-created");
    return ok(student);
  } catch (error) {
    return fail(error, "Failed to add student");
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    const id = requireParam(getStudentIdFromBody(await req.json()), "studentId");
    const result = await deleteClassStudent(scope, id);
    publishClassChanged(scope, "student-deleted");
    return ok(result);
  } catch (error) {
    return fail(error, "Failed to delete student");
  }
}
