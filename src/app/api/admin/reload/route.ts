import { ok } from "@/lib/api/http";
import { publishAllBoardsReload } from "@/lib/realtime/publish";

export async function POST() {
  publishAllBoardsReload("admin-force-reload");
  return ok({ ok: true });
}
