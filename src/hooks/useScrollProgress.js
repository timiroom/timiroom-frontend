/**
 * useScrollProgress
 * -----------------
 * 현재 스크롤 위치를 0~100(%) 범위로 반환합니다.
 *
 * 사용법:
 *   const pct = useScrollProgress();
 *   <div style={{ width: `${pct}%` }} />
 */

"use client";

import { useState, useEffect } from "react";

export function useScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const st = document.documentElement.scrollTop;
      const sh =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      setPct(sh > 0 ? (st / sh) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return pct;
}
