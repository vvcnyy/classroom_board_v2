"use client";

import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Swal from "sweetalert2";
import { CurrentSchedule } from "@/components/tv/CurrentSchedule";
import { DDay } from "@/components/tv/DDay";
import { DropZone } from "@/components/tv/DropZone";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS } from "@/lib/constants/storage";
import { getCurrentAttendanceSlot } from "@/lib/constants/schedule";
import { useClassAuth } from "@/lib/hooks/useClassAuth";
import { useClassRealtime } from "@/lib/hooks/useClassRealtime";
import type { AttendanceCheck, LocationSection, PendingLocationUpdate, Student, StudentDisplayName, StudentStat } from "@/types/domain";
import logo from "../../../../public/dimigo.png";

dayjs.extend(utc);
dayjs.extend(timezone);

interface TvData {
  students: Student[];
  visibleSections: string[];
  attendanceData: AttendanceCheck | null;
  sectionsData: LocationSection[];
}

export default function TvBoardPage() {
  const { id } = useParams<{ id: string }>();
  const { classInfo, loading } = useClassAuth(id);
  const [now, setNow] = useState(dayjs());
  const [notCheckedStudents, setNotCheckedStudents] = useState<string[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<PendingLocationUpdate[]>([]);
  const [displayStudents, setDisplayStudents] = useState<StudentDisplayName[]>([]);
  const pendingUpdatesRef = useRef<PendingLocationUpdate[]>([]);

  useEffect(() => {
    pendingUpdatesRef.current = pendingUpdates;
  }, [pendingUpdates]);

  useEffect(() => {
    if (!loading && !classInfo) location.href = "/tv";
  }, [loading, classInfo]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(dayjs()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    try {
      setDisplayStudents(JSON.parse(localStorage.getItem(STORAGE_KEYS.studentDisplayNames) || "[]"));
    } catch {
      setDisplayStudents([]);
    }
  }, []);

  const { data = { students: [], visibleSections: [], attendanceData: null, sectionsData: [] }, mutate } = useSWR<TvData>(
    classInfo ? `/api/tv?classCode=${id}` : null,
    async () => {
      const updates = [...pendingUpdatesRef.current];
      if (updates.length > 0) {
        setPendingUpdates([]);
        const response = await fetch(`/api/tv?classCode=${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        });
        return response.json();
      }
      return fetch(`/api/tv?classCode=${id}`).then((response) => response.json());
    },
    { refreshInterval: 60000, revalidateOnFocus: false }
  );

  const { students, visibleSections, attendanceData, sectionsData } = data;
  const grade = classInfo?.grade ?? "";
  const classNum = classInfo?.classNum ?? "";
  const revalidateTv = useCallback(() => {
    mutate();
  }, [mutate]);
  const forceReloadTv = useCallback(() => {
    window.location.reload();
  }, []);

  useClassRealtime(classInfo, revalidateTv, forceReloadTv);

  useEffect(() => {
    if (!attendanceData?.student) {
      setNotCheckedStudents([]);
      return;
    }
    const slot = getCurrentAttendanceSlot(dayjs().tz("Asia/Seoul").toDate());
    if (!slot) {
      setNotCheckedStudents([]);
      return;
    }
    setNotCheckedStudents(
      attendanceData.student
        .filter((student: StudentStat) => student.isChecked[slot.label] === false && student.location[slot.label] !== "")
        .map((student) => student.id)
    );
  }, [attendanceData]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const studentId = String(active.id);
    const target = sectionsData.find((section) => section.key === over.id);
    if (!target) return;
    if (students.find((student) => student.id === studentId)?.location === target.key) return;

    let etcContent = "";
    if (target.isETC) {
      const result = await Swal.fire({
        title: "세부 사항",
        text: `${target.label} 위치로 이동할 때는 세부 사항을 입력해야 합니다.`,
        input: "text",
        inputPlaceholder: "세부 사항",
        background: "#1a1a1a",
        color: "#ffffff",
      });
      if (!result.value) return;
      etcContent = result.value;
    }

    mutate(
      (current) =>
        current
          ? {
              ...current,
              students: current.students.map((student) =>
                student.id === studentId ? { ...student, location: target.key, etcContent } : student
              ),
            }
          : current,
      false
    );

    setPendingUpdates((updates) => [
      ...updates.filter((update) => update.studentId !== studentId),
      { studentId, location: target.key, etcContent, timestamp: Date.now() },
    ]);
  }

  async function toggleSection(section: LocationSection) {
    const isVisible = visibleSections.includes(section.key);
    if (isVisible && students.some((student) => student.location === section.key)) {
      const confirm = await Swal.fire({
        title: "이 위치에 학생이 있어요",
        text: "해당 학생을 교실로 이동시킵니다.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "계속",
        cancelButtonText: "취소",
        background: "#1a1a1a",
        color: "#ffffff",
      });
      if (!confirm.isConfirmed) return;
    }

    const nextVisible = isVisible ? visibleSections.filter((key) => key !== section.key) : [...visibleSections, section.key];
    await fetch(`/api/visible-sections?classCode=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: nextVisible, resetLocation: isVisible ? section.key : "" }),
    });
    mutate();
  }

  async function resetLocations() {
    const result = await Swal.fire({
      title: "모든 학생 위치를 초기화할까요?",
      text: "모든 학생을 교실로 이동시킵니다.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "초기화",
      cancelButtonText: "취소",
      background: "#1a1a1a",
      color: "#ffffff",
    });
    if (!result.isConfirmed) return;
    await fetch(`/api/students/reset?classCode=${id}`, { method: "PATCH" });
    setPendingUpdates([]);
    mutate();
  }

  function applyDisplayNames(items: Student[]) {
    return items.map((student) => {
      const display = displayStudents.find((item) => item.id === student.id);
      return display?.name ? { ...student, name: display.name } : student;
    });
  }

  if (loading || !classInfo) return null;

  const absentCount = students.filter(
    (student) =>
      sectionsData.find((section) => section.key === student.location && section.isAbsent) ||
      (student.location === "classroom" && notCheckedStudents.includes(student.id))
  ).length;
  const presentCount = students.length - absentCount;

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="h-[calc(100vh-4vw)] touch-none bg-black text-white">
        <div className="flex h-1/5 w-full border border-white/[0.14]">
          <div className="flex h-full w-1/4 items-center justify-center">
            <CurrentSchedule grade={grade} />
          </div>
          <div className="flex h-full w-2/4 items-center justify-center">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-[0.25vw] text-[2vw] font-medium text-zinc-500">{now.format("YYYY. MM. DD.")}</div>
              <div className="text-[4.4vw] font-bold leading-none text-zinc-50">{now.format("HH:mm")}</div>
            </div>
          </div>
          <div className="flex h-full w-1/4 items-center justify-center">
            <DDay grade={grade} />
          </div>
        </div>
        <div className="flex h-4/5 w-full">
          <div className="flex h-full w-1/5 flex-col">
            <div className="flex h-4/5 w-full flex-col items-center justify-center border border-white/[0.14] p-[1.2vw]">
              <h1 className="mb-[2vw] text-center text-[2vw] font-bold">
                {grade}학년 {classNum}반
                <br />
                인원점검표
              </h1>
              <div className="space-y-[0.8vw]">
                <div className="flex w-[16vw] items-center justify-between rounded-[0.65vw] border border-white/15 bg-white/[0.06] px-[1.2vw] py-[0.8vw]">
                  <span className="text-[1vw] font-semibold text-zinc-200">총원</span>
                  <span className="text-[1.85vw] font-semibold text-zinc-50">{students.length}명</span>
                </div>
                <div className="flex w-[16vw] items-center justify-between rounded-[0.65vw] border border-red-300/35 bg-red-600/28 px-[1.2vw] py-[0.8vw]">
                  <span className="text-[1vw] font-semibold text-red-50">결원</span>
                  <span className="text-[1.85vw] font-semibold text-red-50">{absentCount}명</span>
                </div>
                <div className="flex w-[16vw] items-center justify-between rounded-[0.65vw] border border-green-300/35 bg-green-600/28 px-[1.2vw] py-[0.8vw]">
                  <span className="text-[1vw] font-semibold text-green-50">현원</span>
                  <span className="text-[1.85vw] font-semibold text-green-50">{presentCount}명</span>
                </div>
              </div>
            </div>
            <div className="flex h-1/5 w-full items-center justify-center gap-[2vw] border border-white/[0.14] p-[1.2vw]">
              <Image src={logo} alt="Dimigo Logo" />
            </div>
          </div>
          <div className="flex h-full w-4/5">
            <div className="w-1/4 border border-white/[0.14] p-[1.2vw]">
              <DropZone
                location={{ key: "classroom", label: "교실", isETC: false, isAbsent: false }}
                students={applyDisplayNames(students.filter((student) => student.location === "classroom"))}
                notCheckedStudents={notCheckedStudents}
                sections={sectionsData}
              />
            </div>
            <div className="grid w-3/4 grid-cols-3 gap-[1.05vw] border border-white/[0.14] p-[1.2vw]">
              {sectionsData.filter((section) => section.key !== "classroom" && visibleSections.includes(section.key)).map((section) => (
                <DropZone
                  key={section.key}
                  location={section}
                  students={applyDisplayNames(students.filter((student) => student.location === section.key))}
                  notCheckedStudents={[]}
                  sections={sectionsData}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="z-10 flex h-[4vw] w-full justify-between border border-white/[0.14] bg-[#1a1a1a] px-[1.2vw] py-[0.5vw] text-white shadow-lg">
        <div className="scrollbar-hide flex w-4/5 items-center gap-[0.5vw] overflow-x-auto overflow-y-hidden [mask-image:linear-gradient(to_right,black_95%,transparent)]">
          {sectionsData.filter((section) => section.key !== "classroom").map((section) => (
            <Button
              key={section.key}
              type="button"
              variant="ghost"
              onClick={() => toggleSection(section)}
              className={`h-[2.3vw] whitespace-nowrap rounded-[0.38vw] border px-[0.75vw] py-[0.4vw] text-[0.8vw] shadow-sm ${
                visibleSections.includes(section.key)
                  ? "border-white/10 bg-white/[0.07] text-zinc-100 hover:bg-white/[0.1]"
                  : "border-white/10 bg-white/[0.03] text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-300"
              }`}
            >
              {section.label}
            </Button>
          ))}
        </div>
        <div className="flex w-1/5 items-center justify-end gap-[0.5vw]">
          <Button variant="ghost" onClick={() => { location.href = `/tv/${id}/setting`; }} className="h-[2.3vw] rounded-[0.38vw] border border-white/10 bg-white/[0.07] px-[0.95vw] text-[0.8vw] text-zinc-100 hover:bg-white/[0.1]">설정</Button>
          <Button variant="ghost" onClick={resetLocations} className="h-[2.3vw] rounded-[0.38vw] border border-white/10 bg-white/[0.07] px-[0.95vw] text-[0.8vw] text-zinc-100 hover:bg-white/[0.1]">초기화</Button>
          <Button variant="ghost" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()} className="h-[2.3vw] rounded-[0.38vw] border border-white/10 bg-white/[0.07] px-[0.95vw] text-[0.8vw] text-zinc-100 hover:bg-white/[0.1]">전체화면</Button>
        </div>
      </div>
    </DndContext>
  );
}
