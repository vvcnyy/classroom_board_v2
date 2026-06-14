import { fail, ok } from "@/lib/api/http";
import { getDb } from "@/lib/db/mongodb";
import type { ClassDoc, LocationSection, Student } from "@/types/domain";

function serializeDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : value;
}

function serializeStudent(student: Student) {
  return {
    ...student,
    updatedAt: serializeDate(student.updatedAt),
  };
}

export async function GET(req: Request) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ?? "";
    const grade = searchParams.get("grade") ?? "";
    const classNum = searchParams.get("classNum") ?? searchParams.get("class") ?? "";

    const classes = await db
      .collection<ClassDoc>("class")
      .aggregate<ClassDoc>([
        { $match: { disabled: { $ne: true } } },
        { $addFields: { gradeInt: { $toInt: "$grade" }, classNumInt: { $toInt: "$classNum" } } },
        { $sort: { year: -1, gradeInt: 1, classNumInt: 1 } },
        { $project: { _id: 0, year: 1, grade: 1, classNum: 1, password: 1 } },
      ])
      .toArray();

    const selected =
      classes.find((item) => item.year === year && item.grade === grade && item.classNum === classNum) ??
      classes[0] ??
      null;

    if (!selected) {
      return ok({ classes, selected: null, sections: [], students: [] });
    }

    const [sectionDoc, students] = await Promise.all([
      db.collection<{ sections: LocationSection[] }>("sections").findOne({
        year: selected.year,
        grade: selected.grade,
        class: selected.classNum,
      }),
      db
        .collection<Student>("students")
        .find({ year: selected.year, grade: selected.grade, class: selected.classNum })
        .sort({ number: 1, id: 1 })
        .toArray(),
    ]);

    const sections = sectionDoc?.sections ?? [];
    return ok({
      classes,
      selected: {
        year: selected.year,
        grade: selected.grade,
        classNum: selected.classNum,
      },
      sections,
      students: students.map(serializeStudent),
    });
  } catch (error) {
    return fail(error, "Failed to fetch class locations");
  }
}
