"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";
import type { ClassScope } from "@/types/domain";

export function useClassRealtime(scope: ClassScope | null, onChanged: () => void) {
  const year = scope?.year;
  const grade = scope?.grade;
  const classNum = scope?.classNum;

  useEffect(() => {
    if (!year || !grade || !classNum) return;

    const roomScope = { year, grade, classNum };

    const socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("join-class", roomScope);
    });

    socket.on("class-changed", onChanged);

    return () => {
      socket.emit("leave-class", roomScope);
      socket.disconnect();
    };
  }, [year, grade, classNum, onChanged]);
}
