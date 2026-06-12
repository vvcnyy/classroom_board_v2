import { fail, ok } from "@/lib/api/http";
import { listSchedules } from "@/lib/repositories/schedules";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    return ok(await listSchedules(searchParams.get("grade")));
  } catch (error) {
    return fail(error, "Failed to fetch schedule");
  }
}
