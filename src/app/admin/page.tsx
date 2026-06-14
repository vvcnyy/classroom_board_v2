"use client";

import {
  Activity,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Database,
  Eye,
  LayoutDashboard,
  LayoutList,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  School,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ADMIN_COLLECTIONS, type AdminField } from "@/lib/admin/collections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RESERVATION_DAYS, formatReservationDate } from "@/lib/constants/reservations";
import { cn } from "@/lib/utils/cn";

type AdminDocument = Record<string, unknown> & { _id?: string };
type ClassOption = { _id?: string; year: string; grade: string; classNum: string; password?: string; disabled?: boolean };
type SectionItem = { key: string; label: string; isETC: boolean; isAbsent: boolean };
type SectionDoc = { _id?: string; year: string; grade: string; class: string; sections: SectionItem[] };
type VisibleDoc = { _id?: string; year: string; grade: string; class: string; visible: string[] };

interface AdminResponse {
  page: number;
  limit: number;
  total: number;
  items: AdminDocument[];
}

interface AdminWriteResponse {
  message?: string;
  insertedId?: string;
  document?: AdminDocument;
}

interface LoadItemsOptions {
  page?: number;
  query?: string;
  scopeFilter?: string;
  locationFilter?: string;
}

const iconMap = { Activity, BookOpen, CalendarDays, ClipboardList, Eye, LayoutList, School, Users };
const readMostly = new Set(["access_log", "logs"]);
const navCollections = ADMIN_COLLECTIONS.filter((item) => item.visibleInNav !== false);
const classroomSection: SectionItem = { key: "classroom", label: "교실", isETC: false, isAbsent: false };

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function prettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseFieldValue(field: AdminField, value: string | boolean) {
  if (field.type === "boolean") return Boolean(value);
  if (field.type === "number") return Number(value);
  if (field.type === "json") return typeof value === "string" && value.trim() ? JSON.parse(value) : [];
  return value;
}

function fieldInputValue(field: AdminField, document: AdminDocument) {
  const value = document[field.key];
  if (field.type === "json") return prettyJson(value ?? []);
  if (field.type === "boolean") return Boolean(value);
  return stringifyValue(value);
}

function classKey(option: Pick<ClassOption, "year" | "grade" | "classNum">) {
  return `${option.year}:${option.grade}:${option.classNum}`;
}

function parseClassKey(value: string) {
  const [year, grade, classNum] = value.split(":");
  return { year: year ?? "", grade: grade ?? "", classNum: classNum ?? "" };
}

function getScopeFromDraft(document: AdminDocument, collectionKey: string) {
  return {
    year: String(document.year ?? ""),
    grade: String(document.grade ?? ""),
    classNum: String(collectionKey === "class" ? document.classNum ?? "" : document.class ?? ""),
  };
}

function setScope(document: AdminDocument, collectionKey: string, scopeKey: string) {
  const scope = parseClassKey(scopeKey);
  return {
    ...document,
    year: scope.year,
    grade: scope.grade,
    [collectionKey === "class" ? "classNum" : "class"]: scope.classNum,
  };
}

function sectionOptionsFor(sections: SectionDoc[], document: AdminDocument, collectionKey: string) {
  const scope = getScopeFromDraft(document, collectionKey);
  return sections.find((item) => item.year === scope.year && item.grade === scope.grade && item.class === scope.classNum)?.sections ?? [];
}

function asDraft(value: string, fallback: AdminDocument = {}) {
  try {
    return JSON.parse(value || "{}") as AdminDocument;
  } catch {
    return fallback;
  }
}

function parseDraftStrict(value: string) {
  const parsed = JSON.parse(value || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("문서는 JSON 객체여야 합니다.");
  }
  return parsed as AdminDocument;
}

export default function AdminPage() {
  const [collectionKey, setCollectionKey] = useState(ADMIN_COLLECTIONS[0].key);
  const [items, setItems] = useState<AdminDocument[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sectionDocs, setSectionDocs] = useState<SectionDoc[]>([]);
  const [visibleDocs, setVisibleDocs] = useState<VisibleDoc[]>([]);
  const [classSectionsDraft, setClassSectionsDraft] = useState<SectionItem[]>([]);
  const [classVisibleDraft, setClassVisibleDraft] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("form");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [relatedSaving, setRelatedSaving] = useState(false);
  const [reloadingBoards, setReloadingBoards] = useState(false);
  const [message, setMessage] = useState("");
  const [relatedMessage, setRelatedMessage] = useState("");

  const collection = useMemo(() => ADMIN_COLLECTIONS.find((item) => item.key === collectionKey) ?? ADMIN_COLLECTIONS[0], [collectionKey]);
  const selected = useMemo(() => items.find((item) => item._id === selectedId), [items, selectedId]);
  const parsedDraft = useMemo(() => asDraft(draft, collection.template), [draft, collection.template]);
  const scopeSections = useMemo(() => sectionOptionsFor(sectionDocs, parsedDraft, collection.key), [sectionDocs, parsedDraft, collection.key]);
  const relatedSectionDoc = useMemo(() => {
    const scope = getScopeFromDraft(parsedDraft, "class");
    return sectionDocs.find((item) => item.year === scope.year && item.grade === scope.grade && item.class === scope.classNum);
  }, [parsedDraft, sectionDocs]);
  const relatedVisibleDoc = useMemo(() => {
    const scope = getScopeFromDraft(parsedDraft, "class");
    return visibleDocs.find((item) => item.year === scope.year && item.grade === scope.grade && item.class === scope.classNum);
  }, [parsedDraft, visibleDocs]);
  const visibleLocations = useMemo(() => {
    const values = new Map<string, string>();
    sectionDocs.forEach((doc) => doc.sections.forEach((section) => values.set(section.key, section.label)));
    return [...values.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [sectionDocs]);

  useEffect(() => {
    void loadReferences();
  }, []);

  useEffect(() => {
    if (collection.key !== "class") return;
    setClassSectionsDraft(relatedSectionDoc?.sections ?? [classroomSection]);
    setClassVisibleDraft(relatedVisibleDoc?.visible ?? [classroomSection.key]);
    setRelatedMessage("");
  }, [collection.key, relatedSectionDoc, relatedVisibleDoc, selectedId]);

  useEffect(() => {
    setPage(1);
    setSelectedId(null);
    setScopeFilter("");
    setLocationFilter("");
    setDraft(prettyJson(collection.template));
  }, [collection]);

  useEffect(() => {
    void loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionKey, page, scopeFilter, locationFilter]);

  async function loadReferences() {
    const [classResponse, sectionResponse, visibleResponse] = await Promise.all([
      fetch("/api/admin/class?limit=200", { credentials: "include" }),
      fetch("/api/admin/sections?limit=200", { credentials: "include" }),
      fetch("/api/admin/visible_section?limit=200", { credentials: "include" }),
    ]);
    if (classResponse.ok) {
      const data = (await classResponse.json()) as AdminResponse;
      setClasses(data.items as ClassOption[]);
    }
    if (sectionResponse.ok) {
      const data = (await sectionResponse.json()) as AdminResponse;
      setSectionDocs(data.items as SectionDoc[]);
    }
    if (visibleResponse.ok) {
      const data = (await visibleResponse.json()) as AdminResponse;
      setVisibleDocs(data.items as VisibleDoc[]);
    }
  }

  async function loadItems(options: LoadItemsOptions = {}) {
    const targetPage = options.page ?? page;
    const targetQuery = options.query ?? query;
    const targetScopeFilter = options.scopeFilter ?? scopeFilter;
    const targetLocationFilter = options.locationFilter ?? locationFilter;

    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: "50" });
      if (targetQuery.trim()) params.set("q", targetQuery.trim());
      if (targetScopeFilter) {
        const scope = parseClassKey(targetScopeFilter);
        params.set("year", scope.year);
        params.set("grade", scope.grade);
        params.set(collection.key === "class" ? "classNum" : "class", scope.classNum);
      }
      if (targetLocationFilter) {
        params.set(collection.key === "book" ? "place" : "location", targetLocationFilter);
      }

      const response = await fetch(`/api/admin/${collection.key}?${params.toString()}`, { credentials: "include" });
      const data = (await response.json()) as AdminResponse | { message?: string };
      if (!response.ok) throw new Error("message" in data ? data.message : "목록을 불러오지 못했습니다.");
      const result = data as AdminResponse;
      setItems(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(next: AdminDocument) {
    setDraft(prettyJson(next));
  }

  function updateField(field: AdminField, value: string | boolean) {
    try {
      updateDraft({ ...parsedDraft, [field.key]: parseFieldValue(field, value) });
      setMessage("");
    } catch {
      setMessage(`${field.label} JSON 형식이 올바르지 않습니다.`);
    }
  }

  function selectDocument(document: AdminDocument) {
    setSelectedId(document._id ?? null);
    setDraft(prettyJson(document));
    setMode("form");
  }

  function startCreate() {
    setSelectedId(null);
    setDraft(prettyJson(collection.template));
    setMode("form");
  }

  async function saveDocument() {
    if (collection.readOnly) {
      setMessage("로그 컬렉션은 수정할 수 없습니다.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const document = parseDraftStrict(draft);
      const isUpdate = Boolean(selectedId);
      const response = await fetch(`/api/admin/${collection.key}`, {
        method: isUpdate ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(isUpdate ? { id: selectedId, document } : document),
      });
      const data = (await response.json()) as AdminWriteResponse;
      if (!response.ok) throw new Error(data.message ?? "저장하지 못했습니다.");
      setMessage(isUpdate ? "문서를 수정했습니다." : "문서를 추가했습니다.");
      if (data.document?._id) {
        setSelectedId(data.document._id);
        setDraft(prettyJson(data.document));
      }
      const nextPage = isUpdate ? page : 1;
      await Promise.all([loadItems({ page: nextPage }), collection.key === "sections" || collection.key === "class" ? loadReferences() : Promise.resolve()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "JSON 형식을 확인해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteDocument() {
    if (collection.readOnly) {
      setMessage("로그 컬렉션은 삭제할 수 없습니다.");
      return;
    }
    if (!selectedId || !confirm("선택한 문서를 삭제할까요?")) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/${collection.key}?id=${selectedId}`, { method: "DELETE", credentials: "include" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "삭제하지 못했습니다.");
      setMessage("문서를 삭제했습니다.");
      const nextPage = items.length <= 1 && page > 1 ? page - 1 : page;
      startCreate();
      await Promise.all([loadItems({ page: nextPage }), collection.key === "sections" || collection.key === "class" ? loadReferences() : Promise.resolve()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function reloadAllBoards() {
    setReloadingBoards(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/reload", { method: "POST", credentials: "include" });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "새로고침 신호를 보내지 못했습니다.");
      setMessage("전체 전자칠판에 새로고침 신호를 보냈습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setReloadingBoards(false);
    }
  }

  async function saveRelatedClassData(target: "sections" | "visible_section") {
    const scope = getScopeFromDraft(parsedDraft, "class");
    if (!scope.year || !scope.grade || !scope.classNum) {
      setRelatedMessage("학급을 먼저 선택하거나 입력하세요.");
      return;
    }

    const currentDoc = target === "sections" ? relatedSectionDoc : relatedVisibleDoc;
    const document =
      target === "sections"
        ? { year: scope.year, grade: scope.grade, class: scope.classNum, sections: classSectionsDraft }
        : { year: scope.year, grade: scope.grade, class: scope.classNum, visible: classVisibleDraft };

    setRelatedSaving(true);
    setRelatedMessage("");
    try {
      const response = await fetch(`/api/admin/${target}`, {
        method: currentDoc?._id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(currentDoc?._id ? { id: currentDoc._id, document } : document),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "저장하지 못했습니다.");
      await Promise.all([loadReferences(), collection.key === target ? loadItems() : Promise.resolve()]);
      setRelatedMessage(target === "sections" ? "섹션 구성을 저장했습니다." : "표시 섹션을 저장했습니다.");
    } catch (error) {
      setRelatedMessage(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
    } finally {
      setRelatedSaving(false);
    }
  }

  function labelForSection(scope: Record<string, unknown>, key: string) {
    const year = String(scope.year ?? "");
    const grade = String(scope.grade ?? "");
    const classNum = String(scope.classNum ?? scope.class ?? "");
    const doc = sectionDocs.find((item) => item.year === year && item.grade === grade && item.class === classNum);
    return doc?.sections.find((section) => section.key === key)?.label ?? key;
  }

  function renderBadges(values: string[], scope: AdminDocument, className?: string) {
    return (
      <div className={cn("flex max-w-full flex-wrap gap-1", className)}>
        {values.slice(0, 6).map((value) => (
          <Badge key={value} className="max-w-32 truncate bg-secondary text-secondary-foreground">
            {labelForSection(scope, value)}
          </Badge>
        ))}
        {values.length > 6 && <Badge className="bg-muted text-muted-foreground">+{values.length - 6}</Badge>}
      </div>
    );
  }

  function renderCellValue(item: AdminDocument, field: string) {
    const value = item[field];
    if (field === "location" || field === "place") {
      return <span>{labelForSection(item, stringifyValue(value))}</span>;
    }
    if (collection.key === "book" && field === "date") {
      return <span>{formatReservationDate(value)}</span>;
    }
    if (field === "visible" && Array.isArray(value)) {
      return renderBadges(value.map(String), item);
    }
    if (field === "sections" && Array.isArray(value)) {
      const sections = value as SectionItem[];
      return renderBadges(sections.map((section) => section.key), item);
    }
    if (field === "changes" && value && typeof value === "object") {
      const changes = value as Record<string, unknown>;
      const location = stringifyValue(changes.location);
      return (
        <div className="flex flex-wrap gap-1">
          {location && <Badge className="bg-secondary text-secondary-foreground">{labelForSection(item, location)}</Badge>}
          {stringifyValue(changes.etcContent) && <span className="truncate text-xs text-muted-foreground">{stringifyValue(changes.etcContent)}</span>}
        </div>
      );
    }
    return stringifyValue(value);
  }

  function renderScopeFields(targetKey = collection.key) {
    const scope = getScopeFromDraft(parsedDraft, targetKey);
    const value = scope.year && scope.grade && scope.classNum ? `${scope.year}:${scope.grade}:${scope.classNum}` : "";
    return (
      <div className="space-y-2">
        <Label>학급</Label>
        <Select value={value} onChange={(event) => updateDraft(setScope(parsedDraft, targetKey, event.target.value))}>
          <option value="">학급 선택</option>
          {classes.map((item) => (
            <option key={item._id ?? classKey(item)} value={classKey(item)}>
              {item.year}학년도 {item.grade}학년 {item.classNum}반{item.disabled ? " (비활성)" : ""}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  function renderClassEditor() {
    const updateSection = (index: number, patch: Partial<SectionItem>) => {
      setClassSectionsDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
    };
    const toggleVisible = (key: string) => {
      setClassVisibleDraft((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
    };
    const unknownVisible = classVisibleDraft.filter((key) => !classSectionsDraft.some((section) => section.key === key));

    return (
      <div className="space-y-5">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label>학년도</Label>
              <Input value={stringifyValue(parsedDraft.year)} onChange={(e) => updateDraft({ ...parsedDraft, year: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>학년</Label>
              <Input value={stringifyValue(parsedDraft.grade)} onChange={(e) => updateDraft({ ...parsedDraft, grade: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>반</Label>
              <Input value={stringifyValue(parsedDraft.classNum)} onChange={(e) => updateDraft({ ...parsedDraft, classNum: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>학급 코드</Label>
            <Input value={stringifyValue(parsedDraft.password)} onChange={(e) => updateDraft({ ...parsedDraft, password: e.target.value })} />
          </div>
          <label className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
            <Checkbox checked={Boolean(parsedDraft.disabled)} onChange={(e) => updateDraft({ ...parsedDraft, disabled: e.currentTarget.checked })} />
            비활성화
          </label>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>위치 섹션</Label>
              <p className="mt-1 text-xs text-muted-foreground">학생 위치와 예약 장소로 쓰이는 섹션입니다.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setClassSectionsDraft((current) => [...current, { key: "", label: "", isETC: false, isAbsent: false }])}>
              <Plus className="h-4 w-4" /> 추가
            </Button>
          </div>
          <div className="space-y-2">
            {classSectionsDraft.map((section, index) => {
              const isClassroom = section.key === classroomSection.key;
              return (
              <div key={`${section.key}-${index}`} className="rounded-md border p-3">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input placeholder="key" value={section.key} disabled={isClassroom} onChange={(e) => updateSection(index, { key: e.target.value })} />
                  <Input placeholder="라벨" value={section.label} disabled={isClassroom} onChange={(e) => updateSection(index, { label: e.target.value })} />
                  <Button variant="ghost" size="icon" onClick={() => {
                    setClassSectionsDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
                    setClassVisibleDraft((current) => current.filter((key) => key !== section.key));
                  }} disabled={isClassroom}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <label className="flex items-center gap-2"><Checkbox checked={section.isETC} disabled={isClassroom} onChange={(e) => updateSection(index, { isETC: e.currentTarget.checked })} /> 세부 입력</label>
                  <label className="flex items-center gap-2"><Checkbox checked={section.isAbsent} disabled={isClassroom} onChange={(e) => updateSection(index, { isAbsent: e.currentTarget.checked })} /> 부재 처리</label>
                  <label className="flex items-center gap-2"><Checkbox checked={classVisibleDraft.includes(section.key)} onChange={() => toggleVisible(section.key)} /> 전자칠판 표시</label>
                </div>
              </div>
              );
            })}
            {classSectionsDraft.length === 0 && <p className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">등록된 섹션이 없습니다.</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>현재 표시 섹션</Label>
          {classVisibleDraft.length > 0 ? renderBadges(classVisibleDraft, {
            year: parsedDraft.year,
            grade: parsedDraft.grade,
            class: parsedDraft.classNum,
          }) : <p className="text-sm text-muted-foreground">전자칠판에 표시할 섹션이 없습니다.</p>}
          {unknownVisible.length > 0 && (
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="mb-2 text-xs text-muted-foreground">섹션 목록에 없는 표시 key</p>
              <div className="flex flex-wrap gap-2">
                {unknownVisible.map((key) => (
                  <Button key={key} type="button" variant="secondary" size="sm" onClick={() => toggleVisible(key)}>
                    {key} 해제
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => saveRelatedClassData("sections")} disabled={relatedSaving}>
            {relatedSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            섹션 저장
          </Button>
          <Button type="button" variant="outline" onClick={() => saveRelatedClassData("visible_section")} disabled={relatedSaving}>
            {relatedSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
            표시 저장
          </Button>
        </div>
        {relatedMessage && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{relatedMessage}</p>}
      </div>
    );
  }

  function renderStudentEditor() {
    return (
      <div className="space-y-3">
        {renderScopeFields("students")}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2"><Label>학번</Label><Input value={stringifyValue(parsedDraft.id)} onChange={(e) => updateDraft({ ...parsedDraft, id: e.target.value })} /></div>
          <div className="space-y-2"><Label>번호</Label><Input type="number" value={stringifyValue(parsedDraft.number)} onChange={(e) => updateDraft({ ...parsedDraft, number: Number(e.target.value) })} /></div>
        </div>
        <div className="space-y-2"><Label>이름</Label><Input value={stringifyValue(parsedDraft.name)} onChange={(e) => updateDraft({ ...parsedDraft, name: e.target.value })} /></div>
        <div className="space-y-2">
          <Label>현재 위치</Label>
          <Select value={stringifyValue(parsedDraft.location)} onChange={(e) => updateDraft({ ...parsedDraft, location: e.target.value })}>
            <option value="">위치 선택</option>
            {scopeSections.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}
          </Select>
        </div>
        <div className="space-y-2"><Label>세부 사항</Label><Input value={stringifyValue(parsedDraft.etcContent)} onChange={(e) => updateDraft({ ...parsedDraft, etcContent: e.target.value })} /></div>
      </div>
    );
  }

  function renderBookEditor() {
    const selectedDays = String(parsedDraft.date ?? "").split(",").filter(Boolean);
    const toggleDay = (day: string) => {
      const next = selectedDays.includes(day) ? selectedDays.filter((item) => item !== day) : [...selectedDays, day];
      updateDraft({ ...parsedDraft, date: next.sort().join(",") });
    };
    return (
      <div className="space-y-3">
        {renderScopeFields("book")}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2"><Label>학생 ID</Label><Input value={stringifyValue(parsedDraft.userId)} onChange={(e) => updateDraft({ ...parsedDraft, userId: e.target.value })} /></div>
          <div className="space-y-2"><Label>시간</Label><Input type="time" value={stringifyValue(parsedDraft.time)} onChange={(e) => updateDraft({ ...parsedDraft, time: e.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label>제목</Label><Input value={stringifyValue(parsedDraft.title)} onChange={(e) => updateDraft({ ...parsedDraft, title: e.target.value })} /></div>
        <div className="space-y-2">
          <Label>반복 요일</Label>
          <div className="grid grid-cols-7 gap-1">
            {RESERVATION_DAYS.map(([value, label]) => (
              <Button key={value} type="button" variant={selectedDays.includes(value) ? "default" : "secondary"} size="sm" onClick={() => toggleDay(value)}>
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>장소</Label>
          <Select value={stringifyValue(parsedDraft.place)} onChange={(e) => updateDraft({ ...parsedDraft, place: e.target.value })}>
            <option value="">장소 선택</option>
            {scopeSections.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}
          </Select>
        </div>
        <div className="space-y-2"><Label>세부 사항</Label><Input value={stringifyValue(parsedDraft.etcContent)} onChange={(e) => updateDraft({ ...parsedDraft, etcContent: e.target.value })} /></div>
      </div>
    );
  }

  function renderSectionsEditor() {
    const sections = Array.isArray(parsedDraft.sections) ? parsedDraft.sections as SectionItem[] : [];
    const updateSection = (index: number, patch: Partial<SectionItem>) => {
      updateDraft({ ...parsedDraft, sections: sections.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
    };
    return (
      <div className="space-y-3">
        {renderScopeFields("sections")}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>위치 섹션</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => updateDraft({ ...parsedDraft, sections: [...sections, { key: "", label: "", isETC: false, isAbsent: false }] })}>
              <Plus className="h-4 w-4" /> 추가
            </Button>
          </div>
          <div className="space-y-2">
            {sections.map((section, index) => {
              const isClassroom = section.key === classroomSection.key;
              return (
              <div key={`${section.key}-${index}`} className="rounded-md border p-3">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input placeholder="key" value={section.key} disabled={isClassroom} onChange={(e) => updateSection(index, { key: e.target.value })} />
                  <Input placeholder="label" value={section.label} disabled={isClassroom} onChange={(e) => updateSection(index, { label: e.target.value })} />
                  <Button variant="ghost" size="icon" disabled={isClassroom} onClick={() => updateDraft({ ...parsedDraft, sections: sections.filter((_, itemIndex) => itemIndex !== index) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                  <label className="flex items-center gap-2"><Checkbox checked={section.isETC} disabled={isClassroom} onChange={(e) => updateSection(index, { isETC: e.currentTarget.checked })} /> 세부 입력</label>
                  <label className="flex items-center gap-2"><Checkbox checked={section.isAbsent} disabled={isClassroom} onChange={(e) => updateSection(index, { isAbsent: e.currentTarget.checked })} /> 부재 처리</label>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderVisibleEditor() {
    const visible = Array.isArray(parsedDraft.visible) ? parsedDraft.visible.map(String) : [];
    const toggle = (key: string) => updateDraft({ ...parsedDraft, visible: visible.includes(key) ? visible.filter((item) => item !== key) : [...visible, key] });
    return (
      <div className="space-y-3">
        {renderScopeFields("visible_section")}
        <div className="space-y-2">
          <Label>전자칠판 표시 섹션</Label>
          <div className="grid grid-cols-2 gap-2">
            {scopeSections.map((section) => (
              <label key={section.key} className="flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm">
                <Checkbox checked={visible.includes(section.key)} onChange={() => toggle(section.key)} />
                <span className="truncate">{section.label}</span>
              </label>
            ))}
          </div>
          {scopeSections.length === 0 && <p className="text-sm text-muted-foreground">학급을 선택하면 섹션 목록이 표시됩니다.</p>}
        </div>
      </div>
    );
  }

  function renderScheduleEditor() {
    const grades = String(parsedDraft.grade ?? "").split(",").filter(Boolean);
    const toggle = (grade: string) => updateDraft({ ...parsedDraft, grade: (grades.includes(grade) ? grades.filter((item) => item !== grade) : [...grades, grade]).sort().join(",") });
    return (
      <div className="space-y-3">
        <div className="space-y-2"><Label>일정명</Label><Input value={stringifyValue(parsedDraft.name)} onChange={(e) => updateDraft({ ...parsedDraft, name: e.target.value })} /></div>
        <div className="space-y-2"><Label>날짜</Label><Input type="date" value={stringifyValue(parsedDraft.date).slice(0, 10)} onChange={(e) => updateDraft({ ...parsedDraft, date: e.target.value })} /></div>
        <div className="space-y-2">
          <Label>대상 학년</Label>
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3"].map((grade) => (
              <Button key={grade} type="button" variant={grades.includes(grade) ? "default" : "secondary"} onClick={() => toggle(grade)}>
                {grade}학년
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderGenericEditor() {
    return (
      <div className="space-y-3">
        {readMostly.has(collection.key) && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            이 컬렉션은 감사/접속 기록입니다. 관리자 API에서도 쓰기 요청을 차단하며 조회만 가능합니다.
          </div>
        )}
        {collection.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label>{field.label}</Label>
            {field.type === "boolean" ? (
              <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                <Checkbox checked={Boolean(parsedDraft[field.key])} onChange={(event) => updateField(field, event.currentTarget.checked)} />
                <span className="text-sm text-muted-foreground">{Boolean(parsedDraft[field.key]) ? "true" : "false"}</span>
              </div>
            ) : field.type === "json" ? (
              <Textarea className="min-h-28 font-mono text-xs" value={String(fieldInputValue(field, parsedDraft))} onChange={(event) => updateField(field, event.target.value)} />
            ) : (
              <Input type={field.type === "number" ? "number" : field.type === "date" ? "text" : "text"} placeholder={field.placeholder} value={String(fieldInputValue(field, parsedDraft))} onChange={(event) => updateField(field, event.target.value)} />
            )}
          </div>
        ))}
      </div>
    );
  }

  function renderEditor() {
    if (collection.key === "class") return renderClassEditor();
    if (collection.key === "students") return renderStudentEditor();
    if (collection.key === "book") return renderBookEditor();
    if (collection.key === "sections") return renderSectionsEditor();
    if (collection.key === "visible_section") return renderVisibleEditor();
    if (collection.key === "schedule") return renderScheduleEditor();
    return renderGenericEditor();
  }

  const Icon = iconMap[collection.icon as keyof typeof iconMap] ?? Database;
  const totalPages = Math.max(1, Math.ceil(total / 50));
  const pageNumbers = Array.from(
    new Set([1, totalPages, page - 2, page - 1, page, page + 1, page + 2].filter((value) => value >= 1 && value <= totalPages))
  ).sort((a, b) => a - b);
  const canFilterByScope = ["students", "book", "class"].includes(collection.key);
  const canFilterByLocation = ["students", "book"].includes(collection.key);

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r bg-background">
          <div className="flex h-16 items-center gap-3 border-b px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Dimi Board Admin</p>
              <p className="text-xs text-muted-foreground">Operations Console</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-3 lg:flex-col">
            {navCollections.map((item) => {
              const NavIcon = iconMap[item.icon as keyof typeof iconMap] ?? Database;
              return (
                <button
                  key={item.key}
                  onClick={() => setCollectionKey(item.key)}
                  className={cn("flex min-w-max items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent lg:min-w-0", collectionKey === item.key ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
                >
                  <NavIcon className="h-4 w-4" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="flex min-h-16 flex-col gap-3 border-b bg-background px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-card"><Icon className="h-5 w-5" /></div>
              <div>
                <h1 className="text-xl font-semibold tracking-normal">{collection.label}</h1>
                <p className="text-sm text-muted-foreground">{collection.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-secondary text-secondary-foreground">{collection.collection}</Badge>
              <Button variant="outline" size="sm" onClick={() => loadItems()} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> 새로고침
              </Button>
              <Button variant="secondary" size="sm" onClick={reloadAllBoards} disabled={reloadingBoards}>
                <RefreshCw className={cn("h-4 w-4", reloadingBoards && "animate-spin")} /> 전체 새로고침
              </Button>
            </div>
          </header>

          <div className="grid gap-4 p-4 md:p-6 xl:grid-cols-[1fr_430px]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card><CardHeader className="p-4 pb-2"><CardDescription>Documents</CardDescription><CardTitle>{total.toLocaleString()}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="p-4 pb-2"><CardDescription>Page</CardDescription><CardTitle>{page} / {totalPages}</CardTitle></CardHeader></Card>
                <Card><CardHeader className="p-4 pb-2"><CardDescription>Selected</CardDescription><CardTitle className="truncate text-base">{selected?._id ?? "New document"}</CardTitle></CardHeader></Card>
              </div>

              <Card>
                <CardHeader className="gap-3 p-4">
                  <div className="flex flex-col gap-3">
                    <div>
                      <CardTitle className="text-lg">Collection Data</CardTitle>
                      <CardDescription>업무 단위 필터와 검색으로 필요한 문서를 좁혀서 선택합니다.</CardDescription>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[1fr_180px_180px_auto]">
                      <div className="relative min-w-0">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input className="pl-9" placeholder="검색" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { setPage(1); void loadItems({ page: 1 }); } }} />
                      </div>
                      {canFilterByScope && (
                        <Select value={scopeFilter} onChange={(event) => { setPage(1); setScopeFilter(event.target.value); }}>
                          <option value="">전체 학급</option>
                          {classes.map((item) => <option key={item._id ?? classKey(item)} value={classKey(item)}>{item.grade}-{item.classNum}</option>)}
                        </Select>
                      )}
                      {canFilterByLocation && (
                        <Select value={locationFilter} onChange={(event) => { setPage(1); setLocationFilter(event.target.value); }}>
                          <option value="">전체 위치</option>
                          {visibleLocations.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </Select>
                      )}
                      <Button variant="secondary" onClick={() => { setPage(1); void loadItems({ page: 1 }); }}>검색</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow>{collection.tableFields.map((field) => <TableHead key={field}>{field}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={collection.tableFields.length} className="h-32 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />불러오는 중</TableCell></TableRow>
                      ) : items.length === 0 ? (
                        <TableRow><TableCell colSpan={collection.tableFields.length} className="h-32 text-center text-muted-foreground">데이터가 없습니다.</TableCell></TableRow>
                      ) : items.map((item) => (
                        <TableRow key={item._id} data-state={selectedId === item._id ? "selected" : undefined} className="cursor-pointer" onClick={() => selectDocument(item)}>
                          {collection.tableFields.map((field) => <TableCell key={field} className="max-w-72">{renderCellValue(item, field)}</TableCell>)}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex flex-col gap-3 border-t p-3 md:flex-row md:items-center md:justify-between">
                    <span className="text-xs text-muted-foreground">50개씩 표시 · 총 {total.toLocaleString()}개</span>
                    <div className="flex flex-wrap items-center gap-1">
                      <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage(1)}>처음</Button>
                      <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>이전</Button>
                      {pageNumbers.map((pageNumber, index) => (
                        <div key={pageNumber} className="flex items-center gap-1">
                          {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                            <span className="px-2 text-sm text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={pageNumber === page ? "default" : "outline"}
                            size="sm"
                            disabled={loading}
                            onClick={() => setPage(pageNumber)}
                            className="min-w-9 px-2"
                          >
                            {pageNumber}
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>다음</Button>
                      <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage(totalPages)}>끝</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="h-fit">
              <CardHeader className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{selected ? "Edit Document" : "New Document"}</CardTitle>
                    <CardDescription className="break-all">{selected?._id ?? "업무 형태에 맞춘 입력기로 문서를 작성합니다."}</CardDescription>
                  </div>
                  <Button variant="outline" size="icon" onClick={startCreate}><Plus className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0">
                <Tabs value={mode} onValueChange={setMode}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="form" activeValue={mode} onClick={() => setMode("form")}>업무 입력</TabsTrigger>
                    <TabsTrigger value="json" activeValue={mode} onClick={() => setMode("json")}>JSON</TabsTrigger>
                  </TabsList>
                  {mode === "form" ? (
                    <TabsContent>{renderEditor()}</TabsContent>
                  ) : (
                    <TabsContent>
                      <Textarea
                        className="min-h-[560px] font-mono text-xs"
                        value={draft}
                        readOnly={collection.readOnly}
                        onChange={(event) => setDraft(event.target.value)}
                      />
                    </TabsContent>
                  )}
                </Tabs>

                <Separator />
                {message && <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>}
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={saveDocument} disabled={saving || collection.readOnly}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 저장
                  </Button>
                  <Button variant="destructive" size="icon" onClick={deleteDocument} disabled={saving || collection.readOnly || !selected}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
