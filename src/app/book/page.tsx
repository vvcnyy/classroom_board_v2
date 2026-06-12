"use client";

import dynamic from "next/dynamic";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { STORAGE_KEYS } from "@/lib/constants/storage";
import type { LocationSection } from "@/types/domain";

const days = [
  ["0", "일"],
  ["1", "월"],
  ["2", "화"],
  ["3", "수"],
  ["4", "목"],
  ["5", "금"],
  ["6", "토"],
];

function BookPage() {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [year, setYear] = useState("");
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [sections, setSections] = useState<LocationSection[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [etcContent, setEtcContent] = useState("");

  const selectedSection = useMemo(() => sections.find((section) => section.key === place), [sections, place]);

  useEffect(() => {
    const savedStudent = localStorage.getItem(STORAGE_KEYS.selectedStudent) ?? "";
    const savedYear = localStorage.getItem(STORAGE_KEYS.selectedYear) ?? "";
    const savedGrade = localStorage.getItem(STORAGE_KEYS.selectedGrade) ?? "";
    const savedClass = localStorage.getItem(STORAGE_KEYS.selectedClass) ?? "";
    const savedName = localStorage.getItem(STORAGE_KEYS.selectedStudentName) ?? "";
    setStudentId(savedStudent);
    setYear(savedYear);
    setGrade(savedGrade);
    setClassNum(savedClass);
    setStudentName(savedName);
  }, []);

  useEffect(() => {
    if (!year || !grade || !classNum) return;
    fetch(`/api/sections?year=${year}&grade=${grade}&classNum=${classNum}`)
      .then((response) => response.json())
      .then((data) => setSections(Array.isArray(data) ? data : []))
      .catch(() => setSections([]));
  }, [year, grade, classNum]);

  function toggleDay(day: string) {
    setDate((prev) => (prev.includes(day) ? prev.filter((value) => value !== day) : [...prev, day]));
  }

  async function createReservation() {
    if (!studentId || !date.length || !time || !place) {
      await Swal.fire("오류", "요일, 시간, 장소를 모두 선택해주세요.", "error");
      return;
    }

    if (selectedSection?.isETC && !etcContent.trim()) {
      await Swal.fire("오류", "세부 사항을 입력해주세요.", "error");
      return;
    }

    const response = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        studentId,
        year,
        grade,
        classNum,
        date: date.sort().join(","),
        time,
        place,
        etcContent: selectedSection?.isETC ? etcContent : "",
      }),
    });

    if (!response.ok) {
      await Swal.fire("오류", "예약을 저장하지 못했습니다.", "error");
      return;
    }

    await Swal.fire("성공", "예약이 추가되었습니다.", "success");
    location.href = "/";
  }

  return (
    <main className="dark min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto w-full max-w-xl">
        <Button variant="ghost" className="mb-4" onClick={() => history.back()}>
          <ArrowLeft className="h-4 w-4" /> 돌아가기
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>일정 예약</CardTitle>
            <CardDescription>{studentId ? `${studentId} ${studentName}` : "학생을 먼저 조회해주세요."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="제목" value={title} onChange={(event) => setTitle(event.target.value)} />
            <div className="grid grid-cols-7 gap-1">
              {days.map(([value, label]) => (
                <Button key={value} type="button" variant={date.includes(value) ? "default" : "secondary"} size="sm" onClick={() => toggleDay(value)}>
                  {label}
                </Button>
              ))}
            </div>
            <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            <Select value={place} onChange={(event) => {
              setPlace(event.target.value);
              if (!sections.find((section) => section.key === event.target.value)?.isETC) setEtcContent("");
            }}>
              <option value="">장소 선택</option>
              {sections.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}
            </Select>
            {selectedSection?.isETC && <Input placeholder="세부 사항" value={etcContent} onChange={(event) => setEtcContent(event.target.value)} />}
            <Button className="w-full" onClick={createReservation}>
              <CalendarPlus className="h-4 w-4" /> 예약 추가
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default dynamic(() => Promise.resolve(BookPage), { ssr: false });
