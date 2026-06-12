import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "ERROR"
  ) {
    super(message);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(error: unknown, fallback = "Internal server error") {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: "INTERNAL_ERROR", message: fallback }, { status: 500 });
}

export function requireParam(value: string | null, name: string) {
  if (!value) {
    throw new HttpError(400, `${name} is required`, "MISSING_PARAMETER");
  }
  return value;
}
