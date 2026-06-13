"use client";

import { useDroppable } from "@dnd-kit/core";
import { StudentBadge } from "@/components/tv/StudentBadge";
import type { LocationSection, Student } from "@/types/domain";

export function DropZone({
  location,
  students,
  notCheckedStudents,
  sections,
}: {
  location: LocationSection;
  students: Student[];
  notCheckedStudents: string[];
  sections: LocationSection[];
}) {
  const { setNodeRef } = useDroppable({ id: location.key });
  const isEtc = sections.find((section) => section.key === location.key)?.isETC;
  const columns = isEtc ? "grid-cols-1" : "grid-cols-3";

  return (
    <section
      ref={setNodeRef}
      className="relative h-full overflow-visible rounded-[0.65vw] border border-white/[0.13] bg-zinc-950/85 px-[1.05vw] pb-[0.3vw] pt-[0.7vw] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
    >
      <div className="mb-[0.65vw] flex items-center justify-between gap-[0.5vw]">
        <h2 className="truncate text-left text-[1.08vw] font-semibold text-zinc-50">{location.label}</h2>
        <span className="shrink-0 rounded-[0.35vw] px-[0.5vw] py-[0.15vw] text-[0.7vw] font-semibold text-zinc-300">
          {students.length}명
        </span>
      </div>
      <div className={`grid ${columns} gap-[0.5vw]`}>
        {students.map((student) => (
          <StudentBadge
            key={student.id}
            student={student}
            notChecked={location.key === "classroom" && notCheckedStudents.includes(student.id)}
            sections={sections}
          />
        ))}
      </div>
    </section>
  );
}
