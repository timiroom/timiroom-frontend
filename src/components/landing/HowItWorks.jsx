"use client";

import { SectionHeader } from "@/components/ui";

const STEPS = [
  {
    emoji: "📝", num: 1, title: "PRD 입력",
    desc: "자연어로 작성된 요구사항(PRD)을 시스템에 입력합니다. 기존 문서를 그대로 붙여넣기만 해도 됩니다.",
  },
  {
    emoji: "🤖", num: 2, title: "멀티 에이전트 처리",
    desc: "PM·DBA·API·QA 전문 에이전트가 협업하여 각 도메인별 설계 산출물을 자동 생성합니다.",
  },
  {
    emoji: "🔍", num: 3, title: "정합성 검증",
    desc: "LangGraph 기반 검증 엔진이 설계 요소 간 논리적 모순과 비즈니스 규칙 위반을 탐지합니다.",
  },
  {
    emoji: "📊", num: 4, title: "시각화 및 배포",
    desc: "지식 그래프 대시보드와 Swagger 명세가 자동 생성되어 팀 전체가 실시간으로 설계 정보를 공유합니다.",
  },
];

export function HowItWorks() {
  return (
    <section className="al-section" id="how" style={{ background: "white" }}>
      <div className="al-container">
        <SectionHeader
          eyebrow="작동 방식"
          title={<><span className="hl">스마트한 설계 진화</span>로<br />공간 모든 팀원을 환영합니다</>}
          desc="요구사항 입력 한 번으로 멀티 에이전트 파이프라인이 자동으로 전 주기 산출물을 생성하고 검증합니다."
          center
        />
        <div className="al-how-steps">
          {STEPS.map((s, i) => (
            <div key={s.num} className={`al-how-step al-anim al-d${i + 1}`}>
              <div className="al-step-circle">
                {s.emoji}
                <div className="al-step-num">{s.num}</div>
              </div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
