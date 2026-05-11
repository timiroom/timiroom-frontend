/**
 * Button — 공통 버튼 컴포넌트
 *
 * variant: "primary" | "outline" | "ghost" | "white"
 * size:    "md" | "lg"
 */

"use client";

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  onClick,
  className = "",
  ...props
}) {
  const base = "al-btn";
  const variants = {
    primary: "al-btn-primary",
    outline: "al-btn-outline",
    ghost:   "al-btn-ghost",
    white:   "al-btn-white",
  };
  const sizes = {
    md: "",
    lg: "al-btn-lg",
  };

  const cls = [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");

  if (href) {
    return <a href={href} className={cls} onClick={onClick} {...props}>{children}</a>;
  }
  return <button className={cls} onClick={onClick} {...props}>{children}</button>;
}
