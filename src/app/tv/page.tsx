"use client";

import { Monitor, Plus } from "lucide-react";
import { useState } from "react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function TvEntryPage() {
  const [password, setPassword] = useState("");

  async function enter() {
    if (!password.trim()) return;
    const response = await fetch(`/api/class?classCode=${password}`);
    if (!response.ok) {
      await Swal.fire("오류", "학급을 찾을 수 없습니다.", "error");
      return;
    }
    location.href = `/tv/${password}`;
  }

  return (
    <main className="dark flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Monitor className="h-5 w-5" />
          </div>
          <CardTitle>TV 화면 접속</CardTitle>
          <CardDescription>학급 생성 시 발급된 접속 코드를 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="접속 코드" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter") enter();
          }} />
          <Button className="w-full" onClick={enter}>접속</Button>
          <Button variant="secondary" className="w-full" onClick={() => { location.href = "/class/create"; }}>
            <Plus className="h-4 w-4" /> 학급 생성
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
