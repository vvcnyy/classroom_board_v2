import { cookies } from "next/headers";
import { fail, ok } from "@/lib/api/http";
import { getClassScopeFromBody } from "@/lib/api/params";
import { logAccess } from "@/lib/repositories/logs";
import { publishClassChanged } from "@/lib/realtime/publish";
import { updateLocationAndVisibility } from "@/lib/services/students";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const scope = getClassScopeFromBody(body);
    const itf = body.itf ?? (await cookies()).get("itf")?.value ?? null;
    const result = await updateLocationAndVisibility({
      scope,
      id,
      location: body.location,
      etcContent: body.etcContent,
      itf,
    });

    if (itf) {
      await logAccess({ action: "PATCH", api: "/api/students/[id]", id, ...scope, itf });
    }

    publishClassChanged(scope, "student-location-updated");
    return ok(result);
  } catch (error) {
    return fail(error, "Failed to update student");
  }
}
