import type { ObjectId } from "mongodb";

export type TimeKey = "time1" | "time2" | "study1" | "study2";

export interface LocationSection {
  key: string;
  label: string;
  isETC: boolean;
  isAbsent: boolean;
}

export interface Student {
  _id?: ObjectId | string;
  id: string;
  year: string;
  grade: string;
  class: string;
  name: string;
  number: number;
  location: string;
  etcContent?: string;
  updatedAt?: Date;
  privacyConsentAt?: Date;
}

export interface StudentDisplayName {
  id: string;
  name: string;
}

export interface ClassDoc {
  year: string;
  grade: string;
  classNum: string;
  password: string;
  disabled?: boolean;
  createdAt?: Date;
}

export interface Reservation {
  _id?: ObjectId | string;
  userId: string;
  year: string;
  grade: string;
  class: string;
  date: string;
  time: string;
  place: string;
  title: string;
  etcContent?: string;
}

export interface StudentStat {
  id: string;
  name: string;
  location: Record<TimeKey, string>;
  isChecked: Record<TimeKey, boolean>;
  etcContent: Record<TimeKey, string>;
}

export interface AttendanceCheck {
  date: string;
  student: StudentStat[];
  year?: string;
  grade?: string;
  class?: string;
  auth?: string;
}

export interface ScheduleEvent {
  name: string;
  date: Date | string;
  grade?: string;
}

export interface PendingLocationUpdate {
  studentId: string;
  location: string;
  etcContent?: string;
  timestamp: number;
}

export interface ClassScope {
  year: string;
  grade: string;
  classNum: string;
}
