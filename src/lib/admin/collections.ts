export type AdminFieldType = "text" | "number" | "boolean" | "date" | "json";

export interface AdminField {
  key: string;
  label: string;
  type: AdminFieldType;
  placeholder?: string;
}

export interface AdminCollection {
  key: string;
  collection: string;
  label: string;
  description: string;
  icon: string;
  readOnly?: boolean;
  visibleInNav?: boolean;
  sort: Record<string, 1 | -1>;
  searchFields: string[];
  tableFields: string[];
  fields: AdminField[];
  template: Record<string, unknown>;
}

export const ADMIN_COLLECTIONS: AdminCollection[] = [
  {
    key: "access_log",
    collection: "access_log",
    label: "Access Log",
    description: "학생 조회와 접속 기록",
    icon: "Activity",
    readOnly: true,
    sort: { timestamp: -1 },
    searchFields: ["api", "action", "id", "name", "itf", "class"],
    tableFields: ["timestamp", "action", "api", "id", "name", "itf"],
    fields: [
      { key: "action", label: "Action", type: "text" },
      { key: "api", label: "API", type: "text" },
      { key: "id", label: "Student ID", type: "text" },
      { key: "name", label: "Name", type: "text" },
      { key: "itf", label: "ITF", type: "text" },
      { key: "timestamp", label: "Timestamp", type: "date" },
    ],
    template: { action: "GET", api: "/api/students", id: "", name: "", timestamp: new Date().toISOString() },
  },
  {
    key: "book",
    collection: "book",
    label: "Book",
    description: "학생별 일정 예약",
    icon: "BookOpen",
    sort: { date: -1, time: 1 },
    searchFields: ["userId", "title", "place", "date", "class"],
    tableFields: ["date", "time", "userId", "title", "place", "class"],
    fields: [
      { key: "userId", label: "Student ID", type: "text" },
      { key: "year", label: "Year", type: "text" },
      { key: "grade", label: "Grade", type: "text" },
      { key: "class", label: "Class", type: "text" },
      { key: "date", label: "Date", type: "text" },
      { key: "time", label: "Time", type: "text" },
      { key: "place", label: "Place", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "etcContent", label: "Etc", type: "text" },
    ],
    template: { userId: "", year: "", grade: "", class: "", date: "", time: "", place: "", title: "", etcContent: "" },
  },
  {
    key: "class",
    collection: "class",
    label: "Class",
    description: "학급 코드와 비활성 상태",
    icon: "School",
    sort: { year: -1, grade: 1, classNum: 1 },
    searchFields: ["year", "grade", "classNum", "password"],
    tableFields: ["year", "grade", "classNum", "password", "disabled"],
    fields: [
      { key: "year", label: "Year", type: "text" },
      { key: "grade", label: "Grade", type: "text" },
      { key: "classNum", label: "Class Num", type: "text" },
      { key: "password", label: "Password", type: "text" },
      { key: "disabled", label: "Disabled", type: "boolean" },
      { key: "createdAt", label: "Created At", type: "date" },
    ],
    template: { year: "", grade: "", classNum: "", password: "", disabled: false, createdAt: new Date().toISOString() },
  },
  {
    key: "logs",
    collection: "logs",
    label: "Logs",
    description: "위치 변경 감사 로그",
    icon: "ClipboardList",
    readOnly: true,
    sort: { timestamp: -1 },
    searchFields: ["action", "collection", "id", "year", "grade", "class"],
    tableFields: ["timestamp", "action", "collection", "id", "class", "changes"],
    fields: [
      { key: "action", label: "Action", type: "text" },
      { key: "collection", label: "Collection", type: "text" },
      { key: "id", label: "Student ID", type: "text" },
      { key: "year", label: "Year", type: "text" },
      { key: "grade", label: "Grade", type: "text" },
      { key: "class", label: "Class", type: "text" },
      { key: "changes", label: "Changes", type: "json" },
      { key: "timestamp", label: "Timestamp", type: "date" },
    ],
    template: { action: "update", collection: "students", id: "", year: "", grade: "", class: "", changes: {}, timestamp: new Date().toISOString() },
  },
  {
    key: "schedule",
    collection: "schedule",
    label: "Schedule",
    description: "학년별 주요 일정",
    icon: "CalendarDays",
    sort: { date: 1 },
    searchFields: ["name", "grade"],
    tableFields: ["date", "name", "grade"],
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "grade", label: "Grade", type: "text", placeholder: "1,2,3" },
    ],
    template: { name: "", date: new Date().toISOString(), grade: "" },
  },
  {
    key: "sections",
    collection: "sections",
    label: "Sections",
    description: "학급별 위치 섹션",
    icon: "LayoutList",
    visibleInNav: false,
    sort: { year: -1, grade: 1, class: 1 },
    searchFields: ["year", "grade", "class", "sections.key", "sections.label"],
    tableFields: ["year", "grade", "class", "sections"],
    fields: [
      { key: "year", label: "Year", type: "text" },
      { key: "grade", label: "Grade", type: "text" },
      { key: "class", label: "Class", type: "text" },
      { key: "sections", label: "Sections", type: "json" },
    ],
    template: { year: "", grade: "", class: "", sections: [{ key: "classroom", label: "교실", isETC: false, isAbsent: false }] },
  },
  {
    key: "students",
    collection: "students",
    label: "Students",
    description: "학생과 현재 위치",
    icon: "Users",
    sort: { id: 1 },
    searchFields: ["id", "name", "year", "grade", "class", "location"],
    tableFields: ["id", "name", "year", "grade", "class", "location"],
    fields: [
      { key: "id", label: "ID", type: "text" },
      { key: "year", label: "Year", type: "text" },
      { key: "grade", label: "Grade", type: "text" },
      { key: "class", label: "Class", type: "text" },
      { key: "number", label: "Number", type: "number" },
      { key: "name", label: "Name", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "etcContent", label: "Etc", type: "text" },
      { key: "updatedAt", label: "Updated At", type: "date" },
    ],
    template: { id: "", year: "", grade: "", class: "", number: 0, name: "", location: "classroom", etcContent: "" },
  },
  {
    key: "visible_section",
    collection: "visible_sections",
    label: "Visible Section",
    description: "전자칠판에 표시할 섹션",
    icon: "Eye",
    visibleInNav: false,
    sort: { year: -1, grade: 1, class: 1 },
    searchFields: ["year", "grade", "class", "visible"],
    tableFields: ["year", "grade", "class", "visible"],
    fields: [
      { key: "year", label: "Year", type: "text" },
      { key: "grade", label: "Grade", type: "text" },
      { key: "class", label: "Class", type: "text" },
      { key: "visible", label: "Visible", type: "json" },
    ],
    template: { year: "", grade: "", class: "", visible: ["classroom"] },
  },
] ;

export type AdminCollectionKey = (typeof ADMIN_COLLECTIONS)[number]["key"];

export function getAdminCollection(key: string) {
  return ADMIN_COLLECTIONS.find((collection) => collection.key === key);
}
