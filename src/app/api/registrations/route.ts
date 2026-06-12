import { getDb } from "@/lib/db/mongodb";

export async function POST(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.REGISTRATION_SECRET ?? "fyyBad2llXsMLQC"}`) {
    return Response.json({ message: "Not Allowed" }, { status: 403 });
  }

  const { number, name } = await req.json();
  const db = await getDb();
  await db.collection("students").updateOne({ id: number }, { $set: { name } }, { upsert: true });
  return Response.json({ message: "데이터 처리 완료" });
}
