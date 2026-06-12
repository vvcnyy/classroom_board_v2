import { fail, ok } from "@/lib/api/http";
import { publishClassChanged } from "@/lib/realtime/publish";
import { processAllReservationReloads } from "@/lib/services/reservation-reload";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = process.env.CRON_SECRET;
    if (secret && searchParams.get("token") !== secret) {
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const result = await processAllReservationReloads();
    for (const scope of result.touchedScopes) {
      publishClassChanged(scope, "cron-reservation-reloaded");
    }
    return ok({ success: true, ...result });
  } catch (error) {
    return fail(error, "Failed to process cron reload");
  }
}
