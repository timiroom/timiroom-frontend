"use client";

import { TECH_ITEMS, TechLogoMark, useTechLogos } from "./techStackData";

export function TrustSection() {
  const logos = useTechLogos();
  // 무한 스크롤을 위해 2배 복제. 복제본은 화면 읽기 도구가 두 번 읽지 않게 숨긴다.
  const doubled = [...TECH_ITEMS, ...TECH_ITEMS];

  return (
    <div className="al-trust">
      <div className="al-container">
        <p className="al-trust-lbl">사용된 핵심 기술 스택</p>
      </div>
      <div className="al-logo-wrap">
        <div className="al-logo-track">
          {doubled.map((item, i) => (
            <div className="al-tech-chip" key={i} aria-hidden={i >= TECH_ITEMS.length || undefined}>
              <TechLogoMark item={item} logos={logos} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
