"use client";

import { AlertCircle, CheckCircle2, Clock, MapPin, RefreshCw, Search, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CLASSROOM_SECTION } from "@/lib/constants/sections";
import { useClassRealtime } from "@/lib/hooks/useClassRealtime";
import { cn } from "@/lib/utils/cn";
import { formatKstDateTime } from "@/lib/utils/time";
import type { ClassScope, LocationSection, Student } from "@/types/domain";

type ClassOption = ClassScope;

interface LocationsResponse {
  classes: ClassOption[];
  selected: ClassScope | null;
  sections: LocationSection[];
  students: Student[];
  message?: string;
}

function classKey(scope: ClassScope) {
  return `${scope.year}:${scope.grade}:${scope.classNum}`;
}

function parseClassKey(value: string): ClassScope | null {
  const [year, grade, classNum] = value.split(":");
  if (!year || !grade || !classNum) return null;
  return { year, grade, classNum };
}

function displayName(student: Student) {
  return student.name ? `${student.number}. ${student.name}` : `${student.number}번`;
}

export default function LocationsPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selected, setSelected] = useState<ClassScope | null>(null);
  const [sections, setSections] = useState<LocationSection[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const sectionList = useMemo(() => {
    const values = sections.length > 0 ? sections : [CLASSROOM_SECTION];
    const known = new Set(values.map((section) => section.key));
    const unknown = [...new Set(students.map((student) => student.location).filter((location) => location && !known.has(location)))];
    return [
      ...values,
      ...unknown.map((key) => ({ key, label: key, isETC: false, isAbsent: false })),
    ];
  }, [sections, students]);

  const filteredStudents = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return students;
    return students.filter((student) =>
      [student.id, student.name, String(student.number), student.location, student.etcContent]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [query, students]);

  const grouped = useMemo(() => {
    return sectionList.map((section) => ({
      section,
      students: filteredStudents.filter((student) => student.location === section.key),
    }));
  }, [filteredStudents, sectionList]);

  const absentCount = useMemo(() => {
    const absentSections = new Set(sectionList.filter((section) => section.isAbsent).map((section) => section.key));
    return students.filter((student) => absentSections.has(student.location)).length;
  }, [sectionList, students]);

  const selectedKey = selected ? classKey(selected) : "";

  async function loadLocations(scope = selected) {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (scope) {
        params.set("year", scope.year);
        params.set("grade", scope.grade);
        params.set("classNum", scope.classNum);
      }
      const response = await fetch(`/api/locations?${params.toString()}`, { credentials: "include" });
      const data = (await response.json()) as LocationsResponse;
      if (!response.ok) throw new Error(data.message ?? "위치 현황을 불러오지 못했습니다.");
      setClasses(data.classes);
      setSelected(data.selected);
      setSections(data.sections);
      setStudents(data.students);
      setLastLoadedAt(new Date());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLocations(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useClassRealtime(selected, () => {
    void loadLocations(selected);
  });

  function changeClass(value: string) {
    const scope = parseClassKey(value);
    setSelected(scope);
    void loadLocations(scope);
  }

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-card">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-normal">반별 학생 위치</h1>
                <p className="truncate text-sm text-muted-foreground">
                  {selected ? `${selected.year}학년도 ${selected.grade}학년 ${selected.classNum}반` : "학급 없음"}
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[220px_260px_auto]">
            <Select value={selectedKey} onChange={(event) => changeClass(event.target.value)} disabled={loading || classes.length === 0}>
              <option value="">학급 선택</option>
              {classes.map((item) => (
                <option key={classKey(item)} value={classKey(item)}>
                  {item.year} {item.grade}-{item.classNum}
                </option>
              ))}
            </Select>
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="학생 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <Button variant="outline" onClick={() => void loadLocations(selected)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              새로고침
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
        {message && (
          <div className="flex items-center gap-2 rounded-md border bg-background px-4 py-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-destructive" />
            {message}
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">전체</span>
              <UsersRound className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{students.length}명</p>
          </div>
          <div className="rounded-md border bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">교실/활동</span>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{Math.max(0, students.length - absentCount)}명</p>
          </div>
          <div className="rounded-md border bg-background p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">부재 처리</span>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{absentCount}명</p>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{lastLoadedAt ? formatKstDateTime(lastLoadedAt) : "동기화 대기"}</span>
          {loading && <Badge className="bg-secondary text-secondary-foreground">불러오는 중</Badge>}
        </div>

        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {grouped.map(({ section, students: sectionStudents }) => (
            <Card key={section.key} className={cn(section.isAbsent && "border-destructive/30")}>
              <CardHeader className="flex-row items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{section.label}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">{section.key}</p>
                </div>
                <Badge className={cn("shrink-0", section.isAbsent ? "border-destructive/30 bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground")}>
                  {sectionStudents.length}명
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {sectionStudents.length === 0 ? (
                  <p className="rounded-md border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">학생 없음</p>
                ) : (
                  <div className="grid gap-2">
                    {sectionStudents.map((student) => (
                      <div key={student.id} className="flex min-h-11 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{displayName(student)}</p>
                          <p className="truncate text-xs text-muted-foreground">{student.id}</p>
                        </div>
                        {student.etcContent && (
                          <Badge className="max-w-36 shrink-0 truncate bg-muted text-muted-foreground">
                            {student.etcContent}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
