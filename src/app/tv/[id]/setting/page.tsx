"use client";

import { ArrowDown, ArrowLeft, ArrowUp, MapPin, Plus, Trash2, UsersRound } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STORAGE_KEYS } from "@/lib/constants/storage";
import { makeLocationKey } from "@/lib/utils/location-key";
import type { LocationSection, Student, StudentDisplayName } from "@/types/domain";

interface TvData {
  students: Student[];
  sectionsData: LocationSection[];
}

export default function TvSettingPage() {
  const { id } = useParams<{ id: string }>();
  const [sections, setSections] = useState<LocationSection[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [displayStudents, setDisplayStudents] = useState<StudentDisplayName[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"normal" | "etc">("normal");
  const [countType, setCountType] = useState<"absent" | "present">("absent");
  const [studentId, setStudentId] = useState("");

  const keyPreview = useMemo(() => makeLocationKey(name), [name]);
  const displayMap = useMemo(() => new Map(displayStudents.map((student) => [student.id, student.name])), [displayStudents]);
  const canAddSection = name.trim().length > 0 && keyPreview !== "unknown";
  const canAddStudent = studentId.trim().length > 0;

  useEffect(() => {
    fetch(`/api/tv?classCode=${id}`)
      .then((response) => response.json())
      .then((data: TvData) => {
        setSections(data.sectionsData ?? []);
        setStudents(data.students ?? []);
      });
  }, [id]);

  useEffect(() => {
    let saved: StudentDisplayName[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.studentDisplayNames) || "[]");
    } catch {
      saved = [];
    }
    const savedMap = new Map(saved.map((item) => [item.id, item.name]));
    setDisplayStudents(students.map((student) => ({ id: student.id, name: savedMap.get(student.id) ?? "" })));
  }, [students]);

  async function addSection() {
    if (!canAddSection) return;

    const body = { section: keyPreview, type, label: name, isAbsent: countType === "absent" };
    const response = await fetch(`/api/sections?classCode=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      await Swal.fire("오류", data.message ?? "장소를 추가하지 못했습니다.", "error");
      return;
    }

    setSections((items) => [data, ...items]);
    setName("");
  }

  async function deleteSection(section: LocationSection) {
    if (section.key === "classroom") return;

    const confirm = await Swal.fire({
      title: "정말 삭제할까요?",
      text: `"${section.label}" 장소를 삭제하면 해당 학생들은 교실로 이동합니다.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "삭제",
      cancelButtonText: "취소",
    });
    if (!confirm.isConfirmed) return;

    const response = await fetch(`/api/sections?classCode=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(section),
    });
    if (response.ok) setSections((items) => items.filter((item) => item.key !== section.key));
  }

  async function moveSection(index: number, direction: "up" | "down") {
    const response = await fetch(`/api/sections?classCode=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, direction }),
    });
    setSections(await response.json());
  }

  async function addStudent() {
    if (!canAddStudent) return;

    const response = await fetch(`/api/students?classCode=${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentNumber: studentId }),
    });
    const data = await response.json();
    if (!response.ok) {
      await Swal.fire("오류", data.message ?? "학생을 추가하지 못했습니다.", "error");
      return;
    }

    setStudents((items) => [...items, data]);
    setStudentId("");
  }

  async function deleteStudent(student: Student) {
    const confirm = await Swal.fire({
      title: "정말 삭제할까요?",
      text: `${student.name || student.id} 학생을 삭제합니다.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "삭제",
      cancelButtonText: "취소",
    });
    if (!confirm.isConfirmed) return;

    const response = await fetch(`/api/students?classCode=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id }),
    });
    if (response.ok) setStudents((items) => items.filter((item) => item.id !== student.id));
  }

  function updateDisplayName(studentIdValue: string, value: string) {
    setDisplayStudents((items) => {
      const next = items.some((item) => item.id === studentIdValue)
        ? items.map((item) => (item.id === studentIdValue ? { ...item, name: value } : item))
        : [...items, { id: studentIdValue, name: value }];
      localStorage.setItem(STORAGE_KEYS.studentDisplayNames, JSON.stringify(next));
      return next;
    });
  }

  return (
    <main className="dark min-h-screen bg-background p-4 text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" onClick={() => { location.href = `/tv/${id}`; }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-normal">TV 설정</h1>
              <p className="text-sm text-muted-foreground">장소와 학생 표시 정보를 관리합니다.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="border-white/10 bg-white/[0.06] text-zinc-300">
              <MapPin className="mr-1 h-3.5 w-3.5" /> {sections.length}개 장소
            </Badge>
            <Badge className="border-white/10 bg-white/[0.06] text-zinc-300">
              <UsersRound className="mr-1 h-3.5 w-3.5" /> {students.length}명
            </Badge>
          </div>
        </header>

        <div className="grid w-full gap-4 lg:grid-cols-[1.1fr_0.9fr_1.2fr]">
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>장소 목록</CardTitle>
                  <CardDescription>TV에 표시할 위치 구성을 정렬합니다.</CardDescription>
                </div>
                <Badge className="border-white/10 bg-white/[0.06] text-zinc-300">{sections.length}개</Badge>
              </div>
            </CardHeader>
            <CardContent className="max-h-[72vh] space-y-2 overflow-auto p-3">
              {sections.map((section, index) => {
                const isClassroom = section.key === "classroom";
                const isAboveClassroom = sections[index - 1]?.key === "classroom";
                const isBelowClassroom = sections[index + 1]?.key === "classroom";

                return (
                  <div key={section.key} className="flex items-center justify-between gap-3 rounded-md border bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.04]">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{section.label}</p>
                        {isClassroom && <Badge className="border-primary/20 bg-primary/15 text-[11px] text-zinc-100">기본</Badge>}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge className="border-white/10 bg-white/[0.04] text-[11px] text-zinc-400">{section.key}</Badge>
                        <Badge className="border-white/10 bg-white/[0.04] text-[11px] text-zinc-400">{section.isETC ? "세부 입력" : "일반"}</Badge>
                        <Badge className={section.isAbsent ? "border-rose-300/20 bg-rose-500/12 text-[11px] text-rose-100" : "border-emerald-300/20 bg-emerald-500/12 text-[11px] text-emerald-100"}>
                          {section.isAbsent ? "결원 집계" : "현원 집계"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" disabled={isClassroom || isAboveClassroom || index === 0} onClick={() => moveSection(index, "up")}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" disabled={isClassroom || isBelowClassroom || index === sections.length - 1} onClick={() => moveSection(index, "down")}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" disabled={isClassroom} onClick={() => deleteSection(section)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle>장소 추가</CardTitle>
              <CardDescription>추가한 장소는 TV 하단 토글에서 켤 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">장소 이름</label>
                <Input placeholder="예: 복도, 동아리실" value={name} onChange={(event) => setName(event.target.value)} />
                <p className="text-xs text-muted-foreground">키: <span className="font-mono text-zinc-300">{keyPreview}</span></p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">입력 방식</label>
                <div className="grid grid-cols-2 rounded-md border bg-white/[0.03] p-1">
                  <Button variant={type === "normal" ? "default" : "ghost"} onClick={() => setType("normal")} className="h-9">일반</Button>
                  <Button variant={type === "etc" ? "default" : "ghost"} onClick={() => setType("etc")} className="h-9">세부 입력</Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">집계 방식</label>
                <div className="grid grid-cols-2 rounded-md border bg-white/[0.03] p-1">
                  <Button variant={countType === "absent" ? "default" : "ghost"} onClick={() => setCountType("absent")} className="h-9">결원</Button>
                  <Button variant={countType === "present" ? "default" : "ghost"} onClick={() => setCountType("present")} className="h-9">현원</Button>
                </div>
              </div>

              <Button className="w-full" disabled={!canAddSection} onClick={addSection}>
                <Plus className="h-4 w-4" /> 장소 추가
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>학생 관리</CardTitle>
                  <CardDescription>표시명은 이 전자칠판 브라우저에만 저장됩니다.</CardDescription>
                </div>
                <Badge className="border-white/10 bg-white/[0.06] text-zinc-300">{students.length}명</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3">
              <div className="flex gap-2 rounded-md border bg-white/[0.025] p-2">
                <Input inputMode="numeric" placeholder="번호" value={studentId} onChange={(event) => setStudentId(event.target.value)} />
                <Button disabled={!canAddStudent} onClick={addStudent}>
                  <Plus className="h-4 w-4" /> 추가
                </Button>
              </div>
              <div className="max-h-[61vh] space-y-2 overflow-auto">
                {students.map((student) => (
                  <div key={student.id} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-2 rounded-md border bg-white/[0.025] p-2 transition-colors hover:bg-white/[0.04]">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-muted-foreground">{student.id}</p>
                      <p className="truncate text-sm font-medium">{student.name || `${student.number}번`}</p>
                    </div>
                    <Input
                      placeholder="표시명"
                      value={displayMap.get(student.id) ?? ""}
                      onChange={(event) => updateDisplayName(student.id, event.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => deleteStudent(student)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
