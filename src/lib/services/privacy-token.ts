import { createHash, timingSafeEqual } from "crypto";
import type { ClassScope } from "@/types/domain";

function privacyTokenPayload(scope: ClassScope, classId: string) {
  return `${scope.year}${scope.grade}${scope.classNum}${classId}`;
}

export function createPrivacyRegistrationToken(scope: ClassScope, classId: string) {
  return createHash("sha256").update(privacyTokenPayload(scope, classId)).digest("base64url");
}

export function verifyPrivacyRegistrationToken(scope: ClassScope, classId: string, token: string) {
  const expected = createPrivacyRegistrationToken(scope, classId);
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);

  return expectedBuffer.length === tokenBuffer.length && timingSafeEqual(expectedBuffer, tokenBuffer);
}
