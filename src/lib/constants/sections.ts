import type { LocationSection } from "@/types/domain";

export const CLASSROOM_SECTION: LocationSection = {
  key: "classroom",
  label: "교실",
  isETC: false,
  isAbsent: false,
};

export const DEFAULT_SECTIONS: LocationSection[] = [
  CLASSROOM_SECTION,
  { key: "bathroom", label: "화장실", isETC: false, isAbsent: false },
  { key: "out", label: "외출", isETC: false, isAbsent: true },
  { key: "afterschool", label: "방과후", isETC: false, isAbsent: true },
  { key: "project", label: "프로젝트", isETC: true, isAbsent: true },
  { key: "nurse", label: "보건실/안정실", isETC: false, isAbsent: true },
  { key: "laundry", label: "세탁", isETC: false, isAbsent: false },
  { key: "early", label: "조기입실", isETC: false, isAbsent: false },
  { key: "home", label: "귀가", isETC: false, isAbsent: true },
  { key: "absent", label: "결석", isETC: false, isAbsent: true },
  { key: "late", label: "지연귀교", isETC: false, isAbsent: true },
  { key: "etc", label: "기타", isETC: true, isAbsent: true },
];
