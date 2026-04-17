/**
 * SectionHeader — 섹션 공통 헤더 컴포넌트
 *
 * Props:
 *   eyebrow  {string}       - 상단 소제목 (대문자 표시)
 *   title    {ReactNode}    - 메인 제목 (JSX 포함 가능, <span className="hl"> 사용)
 *   desc     {string}       - 설명 텍스트
 *   center   {boolean}      - 가운데 정렬 여부 (기본 false)
 */

"use client";

export function SectionHeader({ eyebrow, title, desc, center = false }) {
  const wrapCls = center ? "al-center" : "";
  return (
    <div className={wrapCls}>
      {eyebrow && <div className="al-eyebrow al-anim">{eyebrow}</div>}
      <h2 className="al-title al-anim al-d1">{title}</h2>
      {desc && <p className="al-desc al-anim al-d2">{desc}</p>}
    </div>
  );
}
