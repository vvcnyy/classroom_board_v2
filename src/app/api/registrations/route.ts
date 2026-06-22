import { fail, ok } from "@/lib/api/http";
import { publishClassChanged } from "@/lib/realtime/publish";
import { registerPrivacyConsent } from "@/lib/services/students";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await registerPrivacyConsent({
      year: body.year,
      grade: body.grade,
      classNum: body.classNum ?? body.class,
      number: body.number,
      name: body.name,
    });

    if (result.status === "registered") {
      publishClassChanged(result, "student-privacy-registered");
    }

    return ok({
      status: result.status,
      message: result.status === "registered" ? "등록되었습니다." : "이미 등록되어 있습니다.",
      year: result.year,
      grade: result.grade,
      classNum: result.classNum,
      number: result.number,
    });
  } catch (error) {
    return fail(error, "Failed to register privacy consent");
  }
}
