"use client";

import { useScrollProgress } from "@/hooks";

export function ScrollProgress() {
  const pct = useScrollProgress();
  return <div className="al-progress" style={{ width: `${pct}%` }} />;
}
