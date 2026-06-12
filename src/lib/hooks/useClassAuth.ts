"use client";

import { useEffect, useState } from "react";

export function useClassAuth(password?: string) {
  const [classInfo, setClassInfo] = useState<{ year: string; grade: string; classNum: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!password) return;
    const controller = new AbortController();

    async function load() {
      try {
        setLoading(true);
        const response = await fetch(`/api/class?classCode=${password}`, { signal: controller.signal });
        if (!response.ok) {
          setClassInfo(null);
          return;
        }
        setClassInfo(await response.json());
      } catch (error) {
        if ((error as Error).name !== "AbortError") setClassInfo(null);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [password]);

  return { classInfo, loading };
}
