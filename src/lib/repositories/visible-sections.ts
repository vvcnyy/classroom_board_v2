import { getDb } from "@/lib/db/mongodb";
import type { ClassScope } from "@/types/domain";

export interface VisibleSectionDoc {
  year: string;
  grade: string;
  class: string;
  visible: string[];
}

export async function getVisibleSections(scope: ClassScope) {
  const db = await getDb();
  const doc = await db.collection<VisibleSectionDoc>("visible_sections").findOne({
    year: scope.year,
    grade: scope.grade,
    class: scope.classNum,
  });
  return doc?.visible ?? [];
}

export async function setVisibleSections(scope: ClassScope, visible: string[]) {
  const db = await getDb();
  await db.collection<VisibleSectionDoc>("visible_sections").updateOne(
    { year: scope.year, grade: scope.grade, class: scope.classNum },
    { $set: { visible } },
    { upsert: true }
  );
}

export async function addVisibleSections(scope: ClassScope, sectionKeys: string[]) {
  const visible = [...new Set(sectionKeys.filter(Boolean))];
  if (visible.length === 0) return;

  const db = await getDb();
  await db.collection<VisibleSectionDoc>("visible_sections").updateOne(
    { year: scope.year, grade: scope.grade, class: scope.classNum },
    { $addToSet: { visible: { $each: visible } } },
    { upsert: true }
  );
}
