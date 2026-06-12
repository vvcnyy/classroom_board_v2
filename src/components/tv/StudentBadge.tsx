"use client";

import { useDraggable } from "@dnd-kit/core";
import type { LocationSection, Student } from "@/types/domain";

export function StudentBadge({
  student,
  notChecked = false,
  sections,
}: {
  student: Student;
  notChecked?: boolean;
  sections: LocationSection[];
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: student.id });
  const isEtc = sections.find((section) => section.key === student.location)?.isETC;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 9999 : 1,
        transition: isDragging ? undefined : "transform 150ms ease",
      }}
      {...listeners}
      {...attributes}
      className={`relative max-h-[2.1vw] min-h-0 w-full truncate rounded-[0.42vw] border px-[0.35vw] pb-[0.18vw] pt-[0.24vw] text-center text-[0.86vw] text-white shadow-sm ${
        isDragging ? "z-[9999] scale-105 shadow-xl" : "z-10"
      } ${notChecked ? "border-rose-300/45 bg-rose-500/25 text-rose-50" : "border-white/10 bg-white/[0.07] text-zinc-100 hover:bg-white/[0.1]"}`}
    >
      <b>{student.number}</b> {student.name.slice(0, 3)}
      {isEtc && student.etcContent ? ` (${student.etcContent})` : ""}
    </div>
  );
}
