import { HttpError } from "@/lib/api/http";
import { findActiveClassByPassword } from "@/lib/repositories/classes";
import type { ClassScope } from "@/types/domain";

export async function requireClassByPassword(password: string): Promise<ClassScope> {
  const classDoc = await findActiveClassByPassword(password);
  if (!classDoc) {
    throw new HttpError(401, "Invalid class password", "INVALID_AUTH");
  }

  return {
    year: classDoc.year,
    grade: classDoc.grade,
    classNum: classDoc.classNum,
  };
}
