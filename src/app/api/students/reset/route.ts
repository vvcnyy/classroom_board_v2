import { fail, ok } from "@/lib/api/http";
import { getClassCode } from "@/lib/api/params";
import { publishClassChanged } from "@/lib/realtime/publish";
import { requireClassByPassword } from "@/lib/services/auth";
import { resetClassStudents } from "@/lib/services/students";

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    const result = await resetClassStudents(scope);
    publishClassChanged(scope, "students-reset");
    return ok(result);
  } catch (error) {
    return fail(error, "Failed to reset students");
  }
}
