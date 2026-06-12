import { fail, ok, requireParam } from "@/lib/api/http";
import { getClassCode } from "@/lib/api/params";
import { getAttendance, upsertAttendance } from "@/lib/repositories/attendance";
import { requireClassByPassword } from "@/lib/services/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    return ok(await getAttendance(scope, requireParam(searchParams.get("date"), "date")));
  } catch (error) {
    return fail(error, "Failed to fetch attendance");
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const scope = await requireClassByPassword(data.classCode ?? data.auth);
    const result = await upsertAttendance(scope, data);
    return ok({ ok: true, id: result.upsertedId });
  } catch (error) {
    return fail(error, "Failed to save attendance");
  }
}
