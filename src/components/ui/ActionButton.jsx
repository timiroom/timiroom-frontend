"use client";

/**
 * 앱 화면(대시보드·설정) 공통 버튼. 색과 모양은 theme.css의 .ui-btn이 정한다.
 *   variant: "secondary"(기본) | "primary" | "ghost" | "danger"
 *   size:    "sm" | "md"(기본) | "lg"
 *   href를 주면 같은 모양의 링크로 그린다. iconOnly는 아이콘만 든 정사각 버튼.
 * 랜딩 페이지의 pill 버튼은 ui/Button을 쓴다.
 */
export function ActionButton({ children, variant = "secondary", size = "md", href, iconOnly = false, className = "", type = "button", ...props }) {
  const cls = ["ui-btn", variant !== "secondary" && `ui-btn--${variant}`, size !== "md" && `ui-btn--${size}`, iconOnly && "ui-btn--icon", className].filter(Boolean).join(" ");
  if (href) return <a href={href} className={cls} {...props}>{children}</a>;
  return <button type={type} className={cls} {...props}>{children}</button>;
}
