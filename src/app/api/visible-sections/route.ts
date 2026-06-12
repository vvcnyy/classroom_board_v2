import { fail, ok } from "@/lib/api/http";
import { getClassCode } from "@/lib/api/params";
import { publishClassChanged } from "@/lib/realtime/publish";
import { moveStudentsToClassroom } from "@/lib/repositories/students";
import { getVisibleSections, setVisibleSections } from "@/lib/repositories/visible-sections";
import { requireClassByPassword } from "@/lib/services/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    return ok(await getVisibleSections(scope));
  } catch (error) {
    return fail(error, "Failed to fetch visible sections");
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    const { visible, resetLocation, resetStudentLocations } = await req.json();
    await setVisibleSections(scope, Array.isArray(visible) ? visible : []);
    const locationToReset = resetLocation ?? resetStudentLocations;
    if (locationToReset) {
      await moveStudentsToClassroom(scope, locationToReset);
    }
    publishClassChanged(scope, "visible-sections-updated");
    return ok({ ok: true });
  } catch (error) {
    return fail(error, "Failed to update visible sections");
  }
}
