"use client";

import { ArrowLeft, CheckCircle2, FileText, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegistrationResponse = {
  status?: "registered" | "already_registered";
  message?: string;
};

export default function PrivacyConsentPage() {
  const [year, setYear] = useState("2026");
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = useMemo(
    () => token && year.trim() && grade.trim() && classNum.trim() && number.trim() && name.trim() && agreed && !submitting,
    [token, year, grade, classNum, number, name, agreed, submitting]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("t") ?? params.get("token") ?? "");
  }, []);

  async function submitConsent() {
    if (!canSubmit) {
      await Swal.fire("오류", "모든 항목을 입력하고 동의해주세요.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, grade, classNum, number, name, token }),
      });
      const data = (await response.json()) as RegistrationResponse & { message?: string };

      if (!response.ok) {
        await Swal.fire("오류", data.message ?? "등록하지 못했습니다.", "error");
        return;
      }

      setDone(true);
      await Swal.fire("완료", data.message ?? "등록되었습니다.", "success");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <main className="dark flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
        <div className="mx-auto flex w-full max-w-md flex-col gap-5 text-center">
          <header className="flex flex-col items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">QR코드로 접속해주세요</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              개인정보 등록은 전자칠판 화면에 표시된 개인정보 동의 QR코드를 스캔한 경우에만 가능합니다.
            </p>
          </header>

          <Card>
            <CardContent className="space-y-3 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                학급 정보 확인을 위해 QR코드에 포함된 인증값이 필요합니다. 전자칠판의 학교 로고 아래에 있는 QR코드를 휴대폰 카메라로 스캔해주세요.
              </p>
              <Button variant="secondary" className="w-full" onClick={() => { location.href = "/"; }}>
                <ArrowLeft className="h-4 w-4" /> 학생 조회로 돌아가기
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="dark min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
        <header className="flex flex-col items-center gap-2 py-4 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileText className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">개인정보 동의서</h1>
          <p className="text-xs text-muted-foreground">Dimi Attendance Check System</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>학생 정보</CardTitle>
            <CardDescription>입력한 이름은 비어 있는 학생 정보에만 등록됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="year">학년도</Label>
                <Input id="year" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">학년</Label>
                <Input id="grade" inputMode="numeric" value={grade} onChange={(event) => setGrade(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classNum">반</Label>
                <Input id="classNum" inputMode="numeric" value={classNum} onChange={(event) => setClassNum(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">번호</Label>
                <Input id="number" inputMode="numeric" value={number} onChange={(event) => setNumber(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <label className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm leading-6">
              <Checkbox checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
              <span className="text-muted-foreground">
                인원점검과 위치 변경 기능 제공을 위해 학년도, 학년, 반, 번호, 이름을 수집하는 것에 대한&nbsp;
                <a href="https://overjoyed-reading-248.notion.site/254fc619a54880628830d087c81fc8bb" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  개인정보 동의서
                </a>
                에 동의합니다.
              </span>
            </label>
            <Button className="w-full" disabled={!canSubmit} onClick={submitConsent}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {submitting ? "등록 중" : done ? "등록 완료" : "동의하고 등록"}
            </Button>
          </CardContent>
        </Card>

        <Button variant="ghost" className="mx-auto w-fit" onClick={() => { location.href = "/"; }}>
          <ArrowLeft className="h-4 w-4" /> 학생 조회로 돌아가기
        </Button>
      </div>
    </main>
  );
}
