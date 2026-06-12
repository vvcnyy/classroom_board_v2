import { fail, ok, requireParam } from "@/lib/api/http";
import { getClassCode, getClassNum, getStudentId, getStudentIdFromBody, getClassScopeFromBody, getReservationId } from "@/lib/api/params";
import { publishClassChanged } from "@/lib/realtime/publish";
import { createReservation, deleteReservation, findReservations } from "@/lib/repositories/reservations";
import { requireClassByPassword } from "@/lib/services/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = getStudentId(searchParams);

    if (userId) {
      return ok(
        await findReservations({
          userId,
          year: searchParams.get("year"),
          grade: searchParams.get("grade"),
          classNum: getClassNum(searchParams),
        })
      );
    }

    const scope = await requireClassByPassword(getClassCode(searchParams));
    return ok(await findReservations({ ...scope }));
  } catch (error) {
    return fail(error, "Failed to fetch reservations");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const studentId = getStudentIdFromBody(body);
    if (!studentId || !body.date || !body.time || !body.place) {
      return Response.json({ error: "MISSING_FIELDS", message: "필수 예약 정보가 없습니다." }, { status: 400 });
    }

    const scope = getClassScopeFromBody(body);

    await createReservation({
      title: body.title ?? "",
      userId: studentId,
      year: scope.year,
      grade: scope.grade,
      class: scope.classNum,
      date: body.date,
      time: body.time,
      place: body.place,
      etcContent: body.etcContent,
    });
    publishClassChanged(scope, "reservation-created");
    return ok({ message: "Reservation created" });
  } catch (error) {
    return fail(error, "Failed to create reservation");
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const result = await deleteReservation(requireParam(getReservationId(searchParams), "reservationId"));
    if (result.deletedCount === 0) {
      return Response.json({ error: "NOT_FOUND", message: "예약을 찾을 수 없습니다." }, { status: 404 });
    }
    const year = searchParams.get("year");
    const grade = searchParams.get("grade");
    const classNum = getClassNum(searchParams);
    if (year && grade && classNum) {
      publishClassChanged({ year, grade, classNum }, "reservation-deleted");
    }
    return ok({ message: "Reservation deleted successfully" });
  } catch (error) {
    return fail(error, "Failed to delete reservation");
  }
}
