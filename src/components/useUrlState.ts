"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Read/write query params without a server round-trip (Next syncs history.* with useSearchParams). */
export function useUrlState() {
  const params = useSearchParams();

  const set = useCallback(
    (updates: Record<string, string | null>, mode: "push" | "replace" = "replace") => {
      const next = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [],
  );

  return { params, set };
}

export function useBookModal() {
  const { params, set } = useUrlState();
  const openId = Number(params.get("book")) || null;
  const open = useCallback((id: number) => set({ book: String(id) }, "push"), [set]);
  const close = useCallback(() => set({ book: null }, "replace"), [set]);
  return { openId, open, close };
}
