import { fail, ok } from "@/lib/api/http";
import { createClassWithDefaults } from "@/lib/services/classes";

export async function POST(req: Request) {
  try {
    const result = await createClassWithDefaults(await req.json());
    return ok(result);
  } catch (error) {
    return fail(error, "Failed to create class");
  }
}
