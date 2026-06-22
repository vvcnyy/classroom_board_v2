"use client";

import dynamic from "next/dynamic";
import { HelpCircle, MapPin, Plus, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { DeviceCookie } from "@/components/student/DeviceCookie";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatReservationDate } from "@/lib/constants/reservations";
import { STORAGE_KEYS } from "@/lib/constants/storage";
import type { LocationSection, Reservation, Student } from "@/types/domain";

function StudentApp() {
  const [numberQuery, setNumberQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [year, setYear] = useState("");
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [etcContent, setEtcContent] = useState("");
  const [sections, setSections] = useState<LocationSection[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const selectedSection = useMemo(
    () => sections.find((section) => section.key === selectedLocation),
    [sections, selectedLocation]
  );

  useEffect(() => {
    const savedStudent = localStorage.getItem(STORAGE_KEYS.selectedStudent);
    const savedYear = localStorage.getItem(STORAGE_KEYS.selectedYear);
    const savedGrade = localStorage.getItem(STORAGE_KEYS.selectedGrade);
    const savedClass = localStorage.getItem(STORAGE_KEYS.selectedClass);
    const savedName = localStorage.getItem(STORAGE_KEYS.selectedStudentName);

    if (savedStudent && savedYear && savedGrade && savedClass && savedName) {
      setStudentId(savedStudent);
      setYear(savedYear);
      setGrade(savedGrade);
      setClassNum(savedClass);
      setStudentName(savedName);
    }
  }, []);

  useEffect(() => {
    if (!studentId || !year || !grade || !classNum) return;
    localStorage.setItem(STORAGE_KEYS.selectedStudent, studentId);
    localStorage.setItem(STORAGE_KEYS.selectedYear, year);
    localStorage.setItem(STORAGE_KEYS.selectedGrade, grade);
    localStorage.setItem(STORAGE_KEYS.selectedClass, classNum);
    localStorage.setItem(STORAGE_KEYS.selectedStudentName, studentName);
    loadStudentState(studentId, year, grade, classNum);
  }, [studentId, year, grade, classNum, studentName]);

  async function loadStudentState(id: string, targetYear: string, targetGrade: string, targetClass: string) {
    const response = await fetch(`/api/app?studentId=${id}&year=${targetYear}&grade=${targetGrade}&classNum=${targetClass}`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { student: Student[]; book: Reservation[]; sections: LocationSection[] };
    const student = data.student[0];
    setCurrentLocation(student.location);
    setEtcContent(student.etcContent ?? "");
    setSections(data.sections);
    setReservations(data.book ?? []);
  }

  async function findStudent() {
    if (!numberQuery.trim() || !nameQuery.trim()) {
      await Swal.fire("오류", "학번과 이름을 입력해주세요.", "error");
      return;
    }

    const response = await fetch(`/api/students?studentId=${numberQuery}&name=${nameQuery}`);
    const data = (await response.json()) as Student[];
    if (!response.ok || data.length === 0) {
      await Swal.fire({
        icon: "error",
        title: "오류",
        html: "일치하는 학생 정보가 없습니다.<br/><br/>전자칠판 화면의 개인정보 동의 QR코드를 스캔해서 등록해주세요.",
      });
      return;
    }

    setYear(data[0].year);
    setGrade(data[0].grade);
    setClassNum(data[0].class);
    setStudentId(data[0].id);
    setStudentName(data[0].name);
  }

  async function saveLocation() {
    if (!studentId || !selectedLocation) {
      await Swal.fire("오류", "학생과 위치를 선택해주세요.", "error");
      return;
    }

    if (selectedSection?.isETC && !etcContent.trim()) {
      await Swal.fire("오류", "세부 사항을 입력해주세요.", "error");
      return;
    }

    const response = await fetch(`/api/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        year,
        grade,
        classNum,
        location: selectedLocation,
        etcContent: selectedSection?.isETC ? etcContent : "",
      }),
    });

    if (!response.ok) {
      await Swal.fire("오류", "위치를 저장하지 못했습니다.", "error");
      return;
    }

    setCurrentLocation(selectedLocation);
    await Swal.fire("성공", "위치가 저장되었습니다.", "success");
  }

  async function deleteReservation(id?: string) {
    if (!id) return;
    const response = await fetch(`/api/book?reservationId=${id}`, { method: "DELETE" });
    if (response.ok) {
      setReservations((items) => items.filter((item) => String(item._id) !== id));
      await Swal.fire("성공", "예약이 삭제되었습니다.", "success");
    }
  }

  function resetStudent() {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    setStudentId("");
    setStudentName("");
    setCurrentLocation("");
    setReservations([]);
    setSections([]);
  }

  const locationLabel = sections.find((section) => section.key === currentLocation)?.label ?? currentLocation;

  return (
    <main className="dark min-h-screen bg-background px-4 py-8 text-foreground">
      <DeviceCookie />
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="flex flex-col items-center gap-2 py-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MapPin className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">디미고 인원점검</h1>
          <p className="text-xs text-muted-foreground">Attendance Check System</p>
        </header>

        {!studentName ? (
          <Card>
            <CardHeader>
              <CardTitle>학생 조회</CardTitle>
              <CardDescription>개인정보 보호를 위해 학번과 이름으로 조회합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input inputMode="numeric" placeholder="학번" value={numberQuery} onChange={(event) => setNumberQuery(event.target.value)} />
                <Input placeholder="이름" value={nameQuery} onChange={(event) => setNameQuery(event.target.value)} />
              </div>
              <Button className="w-full" onClick={findStudent}>조회</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{studentId} {studentName}</p>
                  <p className="text-xs text-muted-foreground">{year}학년도 {grade}학년 {classNum}반</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetStudent}>변경</Button>
            </CardContent>
          </Card>
        )}

        {currentLocation && (
          <>
            <Card>
              <CardHeader>
                <CardDescription>현재 위치</CardDescription>
                <CardTitle>{locationLabel}{etcContent && sections.find((s) => s.key === currentLocation)?.isETC ? ` (${etcContent})` : ""}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>위치 변경</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedLocation} onChange={(event) => {
                  setSelectedLocation(event.target.value);
                  if (!sections.find((section) => section.key === event.target.value)?.isETC) setEtcContent("");
                }}>
                  <option value="">장소 선택</option>
                  {sections.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}
                </Select>
                {selectedSection?.isETC && <Input placeholder="세부 사항" value={etcContent} onChange={(event) => setEtcContent(event.target.value)} />}
                <Button className="w-full" onClick={saveLocation}>위치 저장</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>일정 예약</CardTitle>
                <CardDescription>전자칠판이 실행 중인 시간에 자동 반영됩니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {reservations.map((reservation) => (
                  <div key={String(reservation._id)} className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{reservation.title || "예약"} {reservation.etcContent ? `(${reservation.etcContent})` : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatReservationDate(reservation.date)} · {reservation.time} · {sections.find((s) => s.key === reservation.place)?.label ?? reservation.place}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteReservation(String(reservation._id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="secondary" className="w-full" onClick={() => { location.href = "/book"; }}>
                  <Plus className="h-4 w-4" /> 예약 추가
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        <footer className="flex flex-col items-center gap-3 border-t py-6 text-center text-xs text-muted-foreground">
          <a className="inline-flex items-center gap-1 text-primary" href="http://overjoyed-reading-248.notion.site/dimigo-app" target="_blank">
            <HelpCircle className="h-4 w-4" /> 도움말
          </a>
          <Badge className="border-muted text-muted-foreground">보안이 검증되지 않은 내부용 사이트입니다.</Badge>
          <p>© 2026 YangWoochan. All rights reserved.</p>
        </footer>
      </div>
    </main>
  );
}

export default dynamic(() => Promise.resolve(StudentApp), { ssr: false });
