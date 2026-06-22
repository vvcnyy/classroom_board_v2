import { getDb } from "@/lib/db/mongodb";
import type { ClassDoc } from "@/types/domain";

export async function findActiveClassByPassword(password: string) {
  const db = await getDb();
  return db.collection<ClassDoc>("class").findOne({ password, disabled: { $ne: true } });
}

export async function listActiveClasses() {
  const db = await getDb();
  return db
    .collection<ClassDoc>("class")
    .aggregate([
      { $match: { disabled: false } },
      { $addFields: { gradeInt: { $toInt: "$grade" }, classNumInt: { $toInt: "$classNum" } } },
      { $sort: { gradeInt: 1, classNumInt: 1 } },
      { $project: { _id: 0, year: 1, grade: 1, classNum: 1 } },
    ])
    .toArray();
}

export async function classExists(year: string, grade: string, classNum: string) {
  const db = await getDb();
  return Boolean(await db.collection<ClassDoc>("class").findOne({ year, grade, classNum }));
}

export async function findActiveClassByScope(year: string, grade: string, classNum: string) {
  const db = await getDb();
  return db.collection<ClassDoc>("class").findOne({ year, grade, classNum, disabled: { $ne: true } });
}

export async function createClass(doc: ClassDoc) {
  const db = await getDb();
  await db.collection<ClassDoc>("class").insertOne(doc);
  return doc;
}

export async function setClassDisabled(password: string, disabled: boolean) {
  const db = await getDb();
  return db.collection<ClassDoc>("class").updateOne({ password }, { $set: { disabled } });
}
