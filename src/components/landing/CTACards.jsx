"use client";

import { Button, SectionHeader } from "@/components/ui";

const CARDS = [
  {
    variant: "purple", icon: "🚀", badge: "무료", title: "빠른 시작",
    desc: "PRD를 붙여넣기만 하면 5분 안에 API 명세와 DB 스키마가 자동 생성됩니다. 별도 설정 없이 즉시 체험하세요.",
    btnVariant: "ghost", btnText: "데모 시작하기 →",
  },
  {
    variant: "light", icon: "📋", badge: "30일 무료", title: "30일 무료 체험",
    desc: "팀 전체가 함께 사용할 수 있는 풀 기능 체험판. 실제 프로젝트에 바로 적용해보세요.",
    btnVariant: "primary", btnText: "체험 시작하기 →",
  },
  {
    variant: "dark", icon: "🤝", badge: null, title: "커스텀 제안",
    desc: "대규모 팀이나 엔터프라이즈 환경을 위한 맞춤형 도입 방안을 제안드립니다. 전문 컨설팅을 받아보세요.",
    btnVariant: "ghost", btnText: "문의하기 →",
  },
];

export function CTACards() {
  return (
    <section className="al-section" id="start" style={{ background: "var(--bg-light)" }}>
      <div className="al-container">
        <SectionHeader
          eyebrow="직접 체험해보면 다릅니다"
          title={<>지금 바로 <span className="hl">Align-it</span>을<br />경험해보세요</>}
          center
        />
        <div className="al-cta-grid">
          {CARDS.map((c, i) => (
            <div key={c.title} className={`al-cta-card ${c.variant} al-anim al-d${i + 1}`}>
              <div className="al-cta-icon">{c.icon}</div>
              {c.badge && <div className="al-cta-badge">{c.badge}</div>}
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
              <Button variant={c.btnVariant} href="#">{c.btnText}</Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
