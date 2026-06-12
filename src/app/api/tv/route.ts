import { cookies } from "next/headers";
import { fail, ok } from "@/lib/api/http";
import { getClassCode } from "@/lib/api/params";
import { logAccess } from "@/lib/repositories/logs";
import { publishClassChanged } from "@/lib/realtime/publish";
import { requireClassByPassword } from "@/lib/services/auth";
import { applyTvUpdates, getTvSnapshot } from "@/lib/services/tv-dashboard";
import type { PendingLocationUpdate } from "@/types/domain";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    const itf = (await cookies()).get("itf")?.value;
    if (itf) {
      await logAccess({ action: "GET", api: "/api/tv", ...scope, class: scope.classNum, itf });
    }
    return ok(await getTvSnapshot(scope));
  } catch (error) {
    return fail(error, "Failed to fetch TV snapshot");
  }
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = await requireClassByPassword(getClassCode(searchParams));
    const { updates = [] } = (await req.json()) as { updates?: PendingLocationUpdate[] };
    const validUpdates = Array.isArray(updates) ? updates : [];
    await applyTvUpdates(scope, validUpdates);
    if (validUpdates.length > 0) {
      publishClassChanged(scope, "tv-bulk-updated");
    }
    return ok(await getTvSnapshot(scope));
  } catch (error) {
    return fail(error, "Failed to update TV snapshot");
  }
}
