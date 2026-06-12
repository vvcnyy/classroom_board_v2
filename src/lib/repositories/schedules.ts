import { getDb } from "@/lib/db/mongodb";
import type { ScheduleEvent } from "@/types/domain";

export async function listSchedules(grade?: string | null) {
  const db = await getDb();
  const data = await db.collection<ScheduleEvent>("schedule").find().toArray();
  if (!grade) return data;
  return data.filter((item) => String(item.grade ?? "").split(",").includes(grade));
}
