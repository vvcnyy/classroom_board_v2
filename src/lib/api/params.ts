import { HttpError, requireParam } from "@/lib/api/http";
import type { ClassScope } from "@/types/domain";

type Body = Record<string, unknown>;

function stringValue(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

export function getClassCode(searchParams: URLSearchParams) {
  return requireParam(
    searchParams.get("classCode") ?? searchParams.get("auth") ?? searchParams.get("password"),
    "classCode"
  );
}

export function getOptionalClassCode(searchParams: URLSearchParams) {
  return searchParams.get("classCode") ?? searchParams.get("auth") ?? searchParams.get("password");
}

export function getStudentId(searchParams: URLSearchParams) {
  return searchParams.get("studentId") ?? searchParams.get("id");
}

export function getReservationId(searchParams: URLSearchParams) {
  return searchParams.get("reservationId") ?? searchParams.get("id");
}

export function getClassNum(searchParams: URLSearchParams) {
  return searchParams.get("classNum") ?? searchParams.get("class");
}

export function getClassScopeFromSearch(searchParams: URLSearchParams): ClassScope {
  return {
    year: requireParam(searchParams.get("year"), "year"),
    grade: requireParam(searchParams.get("grade"), "grade"),
    classNum: requireParam(getClassNum(searchParams), "classNum"),
  };
}

export function getClassScopeFromBody(body: Body): ClassScope {
  const year = stringValue(body.year);
  const grade = stringValue(body.grade);
  const classNum = stringValue(body.classNum ?? body.class);

  if (!year || !grade || !classNum) {
    throw new HttpError(400, "year, grade, classNum are required", "MISSING_CLASS_SCOPE");
  }

  return { year, grade, classNum };
}

export function getStudentIdFromBody(body: Body) {
  return stringValue(body.studentId ?? body.userId ?? body.id);
}

export function getStudentNumberFromBody(body: Body) {
  return stringValue(body.studentNumber ?? body.number ?? body.id);
}
