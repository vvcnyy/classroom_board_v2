import { cookies } from "next/headers";
import { fail, ok, requireParam } from "@/lib/api/http";
import { getClassNum, getStudentId } from "@/lib/api/params";
import { logAccess } from "@/lib/repositories/logs";
import { getStudentAppData } from "@/lib/services/students";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const input = {
      id: requireParam(getStudentId(searchParams), "studentId"),
      year: requireParam(searchParams.get("year"), "year"),
      grade: requireParam(searchParams.get("grade"), "grade"),
      classNum: requireParam(getClassNum(searchParams), "classNum"),
    };

    const result = await getStudentAppData(input);
    const itf = (await cookies()).get("itf")?.value;
    if (itf) {
      await logAccess({ action: "GET", api: "/api/app", ...input, class: input.classNum, itf });
    }

    return ok(result);
  } catch (error) {
    return fail(error, "Failed to fetch app snapshot");
  }
}
