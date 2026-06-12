"use client";

import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function CreateClassPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [studentCount, setStudentCount] = useState("30");
  const [creating, setCreating] = useState(false);

  const parsedStudentCount = Number(studentCount);
  const canCreate = useMemo(
    () =>
      year.trim().length > 0 &&
      grade.trim().length > 0 &&
      classNum.trim().length > 0 &&
      Number.isInteger(parsedStudentCount) &&
      parsedStudentCount >= 0 &&
      parsedStudentCount <= 99,
    [year, grade, classNum, parsedStudentCount]
  );

  async function createClass() {
    if (!canCreate) {
      await Swal.fire("오류", "학급 정보와 학생 수를 확인해주세요.", "error");
      return;
    }

    try {
      setCreating(true);
      const response = await fetch("/api/class/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, grade, classNum, studentCount: parsedStudentCount }),
      });
      const data = await response.json();
      if (!response.ok) {
        await Swal.fire("오류", data.message ?? "학급 생성에 실패했습니다.", "error");
        return;
      }

      const shareUrl = `${location.origin}/tv/${data.class.password}`;
      await Swal.fire({
        icon: "success",
        title: "학급 생성 완료",
        html: `<p style="font-size:14px;margin-bottom:10px">${data.class.year}학년도 ${data.class.grade}학년 ${data.class.classNum}반 · ${parsedStudentCount}명</p><code style="word-break:break-all">${shareUrl}</code>`,
        confirmButtonText: "확인",
      });
      location.href = `/tv/${data.class.password}`;
    } catch (error) {
      await Swal.fire("오류", error instanceof Error ? error.message : "학급 생성 중 오류가 발생했습니다.", "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="dark min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto grid w-full max-w-4xl gap-4">
        <Card>
          <CardHeader>
            <Button variant="ghost" className="mb-2 w-fit px-0" onClick={() => history.back()}>
              <ArrowLeft className="h-4 w-4" /> 돌아가기
            </Button>
            <CardTitle>학급 생성</CardTitle>
            <CardDescription>전자칠판 접속용 학급과 기본 학생 번호를 생성합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input type="number" placeholder="학년도" value={year} onChange={(event) => setYear(event.target.value)} />
            <Input type="number" placeholder="학년" value={grade} onChange={(event) => setGrade(event.target.value)} />
            <Input type="number" placeholder="반" value={classNum} onChange={(event) => setClassNum(event.target.value)} />
            <Input
              type="number"
              min={0}
              max={99}
              placeholder="학생 수"
              value={studentCount}
              onChange={(event) => setStudentCount(event.target.value)}
            />
            <Button className="w-full" disabled={!canCreate || creating} onClick={createClass}>
              {creating ? "생성 중..." : "학급 생성"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
