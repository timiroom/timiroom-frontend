"use client";

import { useEffect, useState } from "react";

function elapsedLabel(seconds) {
  if (seconds < 60) return `${seconds}초`;
  return `${Math.floor(seconds / 60)}분 ${String(seconds % 60).padStart(2, "0")}초`;
}

/**
 * AI가 일하는 동안 보여 주는 진행 표시: 도는 표시 + 문구 + 경과 시간.
 * startedAt(ISO 문자열이나 ms)을 주면 그 시각부터 세고, 없으면 화면에 나타난 순간부터 센다.
 */
export function AiWorking({ label, hint, startedAt, compact = false }) {
  const [start] = useState(() => {
    const parsed = typeof startedAt === "number" ? startedAt : Date.parse(startedAt ?? "");
    return Number.isNaN(parsed) ? Date.now() : Math.min(parsed, Date.now());
  });
  const [seconds, setSeconds] = useState(() => Math.max(0, Math.floor((Date.now() - start) / 1000)));
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [start]);

  return (
    <div className={`ai-working${compact ? " ai-working--compact" : ""}`} role="status" aria-live="polite">
      <span className="ai-working__spinner" aria-hidden="true" />
      <span className="ai-working__body">
        <span className="ai-working__label">{label} <span className="ai-working__time">· {elapsedLabel(seconds)}</span></span>
        {hint && <span className="ai-working__hint">{hint}</span>}
      </span>
    </div>
  );
}
