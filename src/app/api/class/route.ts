import { fail, ok, requireParam } from "@/lib/api/http";
import { getOptionalClassCode } from "@/lib/api/params";
import { findActiveClassByPassword, listActiveClasses } from "@/lib/repositories/classes";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const password = getOptionalClassCode(searchParams);

    if (!password) {
      const classes = await listActiveClasses();
      return ok(classes);
    }

    const classData = await findActiveClassByPassword(requireParam(password, "password"));
    if (!classData) {
      return Response.json({ error: "CLASS_NOT_FOUND", message: "Class not found" }, { status: 404 });
    }

    return ok({ year: classData.year, grade: classData.grade, classNum: classData.classNum });
  } catch (error) {
    return fail(error, "Failed to fetch class");
  }
}
