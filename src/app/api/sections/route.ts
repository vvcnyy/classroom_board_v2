import { fail, ok } from "@/lib/api/http";
import { getClassScopeFromSearch, getOptionalClassCode } from "@/lib/api/params";
import { publishClassChanged } from "@/lib/realtime/publish";
import { getSections } from "@/lib/repositories/sections";
import { requireClassByPassword } from "@/lib/services/auth";
import { addSection, moveSection, removeSection } from "@/lib/services/sections";
import type { LocationSection } from "@/types/domain";

async function resolveScope(req: Request) {
  const { searchParams } = new URL(req.url);
  const classCode = getOptionalClassCode(searchParams);
  if (classCode) return requireClassByPassword(classCode);
  return getClassScopeFromSearch(searchParams);
}

export async function GET(req: Request) {
  try {
    return ok(await getSections(await resolveScope(req)));
  } catch (error) {
    return fail(error, "Failed to fetch sections");
  }
}

export async function PUT(req: Request) {
  try {
    const scope = await resolveScope(req);
    const { section, type, label, isAbsent } = await req.json();
    const data: LocationSection = { key: section, label, isETC: type === "etc", isAbsent: Boolean(isAbsent) };
    const result = await addSection(scope, data);
    publishClassChanged(scope, "section-created");
    return ok(result);
  } catch (error) {
    return fail(error, "Failed to add section");
  }
}

export async function DELETE(req: Request) {
  try {
    const scope = await resolveScope(req);
    const result = await removeSection(scope, await req.json());
    publishClassChanged(scope, "section-deleted");
    return ok(result);
  } catch (error) {
    return fail(error, "Failed to remove section");
  }
}

export async function PATCH(req: Request) {
  try {
    const scope = await resolveScope(req);
    const { index, direction } = await req.json();
    if (!Number.isInteger(index) || (direction !== "up" && direction !== "down")) {
      return Response.json({ error: "INVALID_PAYLOAD", message: "index와 direction이 필요합니다." }, { status: 400 });
    }
    const result = await moveSection(scope, index, direction);
    publishClassChanged(scope, "section-moved");
    return ok(result);
  } catch (error) {
    return fail(error, "Failed to move section");
  }
}
