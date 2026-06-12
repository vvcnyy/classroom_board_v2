import { fail, ok } from "@/lib/api/http";
import { getClassCode } from "@/lib/api/params";
import { publishClassChanged } from "@/lib/realtime/publish";
import { requireClassByPassword } from "@/lib/services/auth";
import { processReservationReload } from "@/lib/services/reservation-reload";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    const result = await processReservationReload(scope);
    if (result.length > 0) {
      publishClassChanged(scope, "reservation-reloaded");
    }
    return ok(result);
  } catch (error) {
    return fail(error, "Failed to reload reservations");
  }
}
