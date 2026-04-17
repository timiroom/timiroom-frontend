"use client";

import { SectionHeader } from "@/components/ui";

const FEATURES = [
  {
    icon: "🔄",
    title: "Full-Cycle 설계 자동화",
    desc: "PRD 자연어 요구사항을 분석하여 API 명세, DB 스키마, QA 시나리오까지 전 주기 산출물을 자동 생성합니다.",
  },
  {
    icon: "🕸️",
    title: "지식 그래프 시각화",
    desc: "설계 요소 간 복잡한 연결 고리를 지식 그래프로 시각화하여 특정 요소 변경 시 영향 범위를 즉시 파악합니다.",
  },
  {
    icon: "🤖",
    title: "멀티 에이전트 검증",
    desc: "PM·DBA·API·QA 전문 에이전트가 협업하여 비즈니스 로직과 설계 의도의 논리적 정합성을 실시간 검토합니다.",
  },
  {
    icon: "📋",
    title: "표준 명세 자동 생성",
    desc: "Swagger, Mermaid 다이어그램, 버전 스냅샷을 자동 생성하여 기획부터 QA까지 동일한 최신 설계 정보를 공유합니다.",
  },
];

export function Features() {
  return (
    <section className="al-section" id="features" style={{ background: "white" }}>
      <div className="al-container">
        <SectionHeader
          eyebrow="핵심 기능"
          title={<>설계 파편화 문제를<br /><span className="hl">AI로 해결합니다</span></>}
          desc="현대 IT 개발 현장의 기획과 기술 명세 파편화로 인한 재작업 리스크를 LLM과 지식 그래프의 결합으로 근본적으로 해소합니다."
          center
        />
        <div className="al-feat-grid">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`al-feat-card al-anim al-d${i + 1}`}>
              <div className="al-feat-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
