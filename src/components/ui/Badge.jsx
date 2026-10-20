"use client";

/**
 * 짧은 상태·분류 표시. tone: "neutral"(기본) | "success" | "warning" | "danger" | "info"
 * 색은 상태를 전할 때만 쓰고, 문서 종류 같은 분류는 neutral로 둔다.
 */
export function Badge({ children, tone = "neutral", className = "", ...props }) {
  const cls = ["ui-badge", tone !== "neutral" && `ui-badge--${tone}`, className].filter(Boolean).join(" ");
  return <span className={cls} {...props}>{children}</span>;
}
