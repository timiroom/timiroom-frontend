"use client";

const STEPS = [
  {
    num: "01", title: "아이디어 입력",
    desc: "만들고 싶은 서비스를 대화로 설명합니다. 이미 있는 기획 문서를 그대로 붙여넣어도 됩니다.",
  },
  {
    num: "02", title: "7-에이전트 파이프라인",
    desc: "Search·PM·PRD·기능 명세·API·DB·QA 전문 에이전트가 순차·병렬로 협업하여 각 도메인별 설계 산출물을 자동 생성합니다.",
  },
  {
    num: "03", title: "정합성 검증",
    desc: "지식 그래프 기반 검증 엔진이 기능·API·DB 간 논리적 모순과 비즈니스 규칙 위반을 자동 탐지합니다.",
  },
  {
    num: "04", title: "시각화 & 공유",
    desc: "워크플로우 그래프 대시보드와 Swagger 명세가 자동 생성되어 팀 전체가 동일한 설계 정보를 실시간으로 공유합니다.",
  },
  {
    num: "05", title: "피드백 & 재검증",
    desc: "AI와 대화하며 설계를 고치면 연결된 문서까지 함께 고친 변경안이 만들어지고, 교차검증과 PM 승인을 거쳐 기준 명세에 반영됩니다.",
  },
  {
    num: "06", title: "최종 산출물 다운로드",
    desc: "PRD는 PDF로, API 명세는 OpenAPI·Postman으로, ERD는 SQL로 내보내 개발 팀에 바로 전달합니다.",
  },
];

export function HowItWorks() {
  return (
    <section className="al-how al-section" id="how">
      <div className="al-container">
        <div className="al-section-header center al-anim">
          <div className="al-section-eyebrow">작동 방식</div>
          <h2 className="al-section-title">
            입력 한 번으로<br />
            <span className="hl">전 주기가 자동화</span>됩니다
          </h2>
          <p className="al-section-desc">
            요구사항 입력부터 산출물 배포까지, 멀티 에이전트 파이프라인이
            전 과정을 자동으로 처리하고 검증합니다.
          </p>
        </div>

        <div className="al-steps">
          {STEPS.map((s, i) => (
            <div key={s.num} className={`al-step al-anim al-d${(i % 3) + 1}`}>
              <div className="al-step-num">{s.num}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
