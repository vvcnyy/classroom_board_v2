import { HttpError } from "@/lib/api/http";
import { hasSection, getSections, setSections } from "@/lib/repositories/sections";
import { moveStudentsToClassroom } from "@/lib/repositories/students";
import { getVisibleSections, setVisibleSections } from "@/lib/repositories/visible-sections";
import type { ClassScope, LocationSection } from "@/types/domain";

export async function addSection(scope: ClassScope, section: LocationSection) {
  if (!section.key || section.key === "unknown" || !section.label) {
    throw new HttpError(400, "올바른 장소 이름을 입력해주세요.", "INVALID_SECTION");
  }

  if (await hasSection(scope, section.key)) {
    throw new HttpError(400, "이미 존재하는 장소입니다.", "SECTION_EXISTS");
  }

  const sections = await getSections(scope);
  await setSections(scope, [section, ...sections]);
  return section;
}

export async function removeSection(scope: ClassScope, section: LocationSection) {
  const sections = await getSections(scope);
  await setSections(
    scope,
    sections.filter((item) => item.key !== section.key)
  );

  const visible = await getVisibleSections(scope);
  await setVisibleSections(
    scope,
    visible.filter((key) => key !== section.key)
  );

  await moveStudentsToClassroom(scope, section.key);
  return { ok: true };
}

export async function moveSection(scope: ClassScope, index: number, direction: "up" | "down") {
  const sections = await getSections(scope);
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || index >= sections.length || targetIndex < 0 || targetIndex >= sections.length) {
    return sections;
  }

  const next = [...sections];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  await setSections(scope, next);
  return next;
}
