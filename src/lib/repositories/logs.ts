import { getDb } from "@/lib/db/mongodb";
import type { ClassScope, PendingLocationUpdate } from "@/types/domain";

export async function logAccess(entry: Record<string, unknown>) {
  const db = await getDb();
  await db.collection("access_log").insertOne({ ...entry, timestamp: new Date() });
}

export async function logLocationUpdate(scope: ClassScope, id: string, location: string, etcContent?: string, itf?: string | null) {
  const db = await getDb();
  await db.collection("logs").insertOne({
    action: "update",
    collection: "students",
    id,
    itf,
    year: scope.year,
    grade: scope.grade,
    class: scope.classNum,
    changes: { location, etcContent },
    timestamp: new Date(),
  });
}

export async function logBulkLocationUpdates(scope: ClassScope, updates: PendingLocationUpdate[]) {
  if (updates.length === 0) return;
  const db = await getDb();
  await db.collection("logs").insertMany(
    updates.map((update) => ({
      action: "update",
      collection: "students",
      id: update.studentId,
      year: scope.year,
      grade: scope.grade,
      class: scope.classNum,
      changes: { location: update.location, etcContent: update.etcContent },
      timestamp: new Date(update.timestamp || Date.now()),
    }))
  );
}
