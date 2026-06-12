import { getDb } from "@/lib/db/mongodb";
import type { ClassScope, LocationSection } from "@/types/domain";

export interface SectionDoc extends ClassScope {
  class: string;
  sections: LocationSection[];
}

export async function getSections(scope: ClassScope) {
  const db = await getDb();
  const doc = await db.collection<SectionDoc>("sections").findOne({
    year: scope.year,
    grade: scope.grade,
    class: scope.classNum,
  });
  return doc?.sections ?? [];
}

export async function setSections(scope: ClassScope, sections: LocationSection[]) {
  const db = await getDb();
  await db.collection("sections").updateOne(
    { year: scope.year, grade: scope.grade, class: scope.classNum },
    { $set: { sections } },
    { upsert: true }
  );
}

export async function hasSection(scope: ClassScope, key: string) {
  const db = await getDb();
  return Boolean(
    await db.collection("sections").findOne({
      year: scope.year,
      grade: scope.grade,
      class: scope.classNum,
      "sections.key": key,
    })
  );
}
