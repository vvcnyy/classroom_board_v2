import { fail, ok } from "@/lib/api/http";
import { getClassCode } from "@/lib/api/params";
import { findStudents } from "@/lib/repositories/students";
import { getVisibleSections, setVisibleSections } from "@/lib/repositories/visible-sections";
import { requireClassByPassword } from "@/lib/services/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    const [visible, students] = await Promise.all([
      getVisibleSections(scope),
      findStudents({ year: scope.year, grade: scope.grade, classNum: scope.classNum }),
    ]);
    const usedLocations = [...new Set(students.map((student) => student.location).filter(Boolean))];
    const next = [...visible, ...usedLocations.filter((location) => !visible.includes(location))];
    await setVisibleSections(scope, next);
    return ok({ ok: true, visible: next });
  } catch (error) {
    return fail(error, "Failed to reload visible sections");
  }
}
