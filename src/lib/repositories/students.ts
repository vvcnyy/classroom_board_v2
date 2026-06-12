import { getDb } from "@/lib/db/mongodb";
import type { ClassScope, PendingLocationUpdate, Student } from "@/types/domain";

export interface StudentFilters {
  id?: string | null;
  name?: string | null;
  year?: string | null;
  grade?: string | null;
  classNum?: string | null;
}

function buildStudentQuery(filters: StudentFilters) {
  const query: Record<string, unknown> = {};
  if (filters.id) query.id = filters.id;
  if (filters.name) query.name = { $regex: filters.name, $options: "i" };
  if (filters.year) query.year = filters.year;
  if (filters.grade) query.grade = filters.grade;
  if (filters.classNum) query.class = filters.classNum;
  return query;
}

export async function findStudents(filters: StudentFilters) {
  const db = await getDb();
  return db.collection<Student>("students").find(buildStudentQuery(filters)).sort({ id: 1 }).toArray();
}

export async function createStudent(student: Student) {
  const db = await getDb();
  await db.collection<Student>("students").insertOne(student);
  return student;
}

export async function createStudents(students: Student[]) {
  if (students.length === 0) return [];

  const db = await getDb();
  await db.collection<Student>("students").insertMany(students);
  return students;
}

export async function deleteStudent(scope: ClassScope, id: string) {
  const db = await getDb();
  return db.collection<Student>("students").deleteOne({
    id,
    year: scope.year,
    grade: scope.grade,
    class: scope.classNum,
  });
}

export async function updateStudentLocation(scope: ClassScope, id: string, location: string, etcContent?: string) {
  const db = await getDb();
  return db.collection<Student>("students").updateOne(
    { id, year: scope.year, grade: scope.grade, class: scope.classNum },
    {
      $set: {
        location,
        etcContent: etcContent || "",
        updatedAt: new Date(),
      },
    }
  );
}

export async function bulkUpdateStudentLocations(scope: ClassScope, updates: PendingLocationUpdate[]) {
  if (updates.length === 0) return;

  const db = await getDb();
  await db.collection<Student>("students").bulkWrite(
    updates.map((update) => ({
      updateOne: {
        filter: { id: update.studentId, year: scope.year, grade: scope.grade, class: scope.classNum },
        update: {
          $set: {
            location: update.location,
            etcContent: update.etcContent || "",
            updatedAt: new Date(update.timestamp || Date.now()),
          },
        },
      },
    }))
  );
}

export async function resetStudentLocations(scope: ClassScope, location = "classroom") {
  const db = await getDb();
  return db.collection<Student>("students").updateMany(
    { year: scope.year, grade: scope.grade, class: scope.classNum },
    { $set: { location, etcContent: "", updatedAt: new Date() } }
  );
}

export async function moveStudentsToClassroom(scope: ClassScope, fromLocation: string) {
  const db = await getDb();
  return db.collection<Student>("students").updateMany(
    { year: scope.year, grade: scope.grade, class: scope.classNum, location: fromLocation },
    { $set: { location: "classroom", etcContent: "", updatedAt: new Date() } }
  );
}
