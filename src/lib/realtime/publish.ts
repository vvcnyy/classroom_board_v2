import type { Server } from "socket.io";
import type { ClassScope } from "@/types/domain";

declare global {
  var __classroomIo: Server | undefined;
}

function scopeRoom(scope: ClassScope) {
  return `class:${scope.year}:${scope.grade}:${scope.classNum}`;
}

export function publishClassChanged(scope: ClassScope, reason: string) {
  globalThis.__classroomIo?.to(scopeRoom(scope)).emit("class-changed", {
    reason,
    scope,
    at: Date.now(),
  });
}

export function publishAllBoardsReload(reason: string) {
  globalThis.__classroomIo?.emit("force-reload", {
    reason,
    at: Date.now(),
  });
}
