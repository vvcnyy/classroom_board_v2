import { fail, ok } from "@/lib/api/http";
import { getClassCode } from "@/lib/api/params";
import { listAttendanceDates } from "@/lib/repositories/attendance";
import { requireClassByPassword } from "@/lib/services/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    return ok(await listAttendanceDates(scope));
  } catch (error) {
    return fail(error, "Failed to fetch attendance dates");
  }
}
