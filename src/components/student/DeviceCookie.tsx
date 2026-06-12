"use client";

import { useEffect } from "react";

export function DeviceCookie() {
  useEffect(() => {
    const exists = document.cookie.split(";").some((cookie) => cookie.trim().startsWith("itf="));
    if (exists) return;

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const value = btoa(String.fromCharCode(...bytes)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 22);
    document.cookie = `itf=${value}; SameSite=Lax; Max-Age=157680000; path=/`;
  }, []);

  return null;
}
