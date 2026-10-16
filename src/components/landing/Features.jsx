"use client";

import { useEffect, useRef, useState } from "react";

/* ── SVG 일러스트레이션 ── */
function RequirementIllus() {
  return (
    <div className="al-pipe-illus">
      <svg width="320" height="240" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* PRD 문서 카드 */}
        <rect x="20" y="60" width="110" height="120" rx="12" fill="white" stroke="var(--border-2)" strokeWidth="1.5"/>
        <rect x="36" y="82" width="78" height="9" rx="4" fill="var(--border)"/>
        <rect x="36" y="100" width="58" height="9" rx="4" fill="var(--border)"/>
        <rect x="36" y="118" width="68" height="9" rx="4" fill="var(--border)"/>
        <rect x="36" y="136" width="50" height="9" rx="4" fill="var(--border)"/>
        <rect x="36" y="154" width="62" height="9" rx="4" fill="var(--border)"/>
        <text x="75" y="78" fontSize="10" fontWeight="700" fill="var(--text-2)" textAnchor="middle" fontFamily="sans-serif">PRD</text>

        {/* 화살표 */}
        <path d="M136 118 L162 118" stroke="var(--text-2)" strokeWidth="2" strokeDasharray="4 3"/>
        <polygon points="162,113 174,118 162,123" fill="var(--text-2)"/>

        {/* MoSCoW 우선순위 */}
        <rect x="178" y="44" width="122" height="34" rx="8" fill="var(--text-1)" opacity="0.15"/>
        <rect x="188" y="55" width="50" height="7" rx="3" fill="var(--text-1)" opacity="0.7"/>
        <text x="260" y="64" fontSize="9" fontWeight="800" fill="var(--text-1)" fontFamily="sans-serif">Must</text>

        <rect x="178" y="86" width="122" height="34" rx="8" fill="var(--text-2)" opacity="0.12"/>
        <rect x="188" y="97" width="65" height="7" rx="3" fill="var(--text-2)" opacity="0.6"/>
        <text x="260" y="106" fontSize="9" fontWeight="800" fill="var(--text-2)" fontFamily="sans-serif">Should</text>

        <rect x="178" y="128" width="122" height="34" rx="8" fill="var(--text-1)" opacity="0.1"/>
        <rect x="188" y="139" width="48" height="7" rx="3" fill="var(--text-1)" opacity="0.5"/>
        <text x="260" y="148" fontSize="9" fontWeight="800" fill="var(--text-1)" fontFamily="sans-serif">Could</text>

        <rect x="178" y="170" width="122" height="34" rx="8" fill="#9ca3af" opacity="0.12"/>
        <rect x="188" y="181" width="58" height="7" rx="3" fill="#9ca3af" opacity="0.5"/>
        <text x="260" y="190" fontSize="9" fontWeight="800" fill="#9ca3af" fontFamily="sans-serif">Won&apos;t</text>
      </svg>
    </div>
  );
}

/* 아래 두 그림은 첫 그림(RequirementIllus)과 같은 방식으로 그린다:
   흰 카드 + 연한 테두리, 글자 대신 둥근 막대, 점선 화살표, 회색 농도로만 단계 구분. */

/** 명세 자동 생성 — 기능 목록 하나에서 PRD·ERD·API 명세가 함께 나온다. */
function SpecIllus() {
  const rows = [
    { y: 52,  label: "PRD", bg: "var(--text-1)", bgOp: 0.15, bar: 56, barOp: 0.7, text: "var(--text-1)" },
    { y: 102, label: "ERD", bg: "var(--text-2)", bgOp: 0.12, bar: 64, barOp: 0.6, text: "var(--text-2)" },
    { y: 152, label: "API", bg: "var(--text-1)", bgOp: 0.1,  bar: 48, barOp: 0.5, text: "var(--text-1)" },
  ];
  return (
    <div className="al-pipe-illus">
      <svg width="320" height="240" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 기능 목록 카드 */}
        <rect x="20" y="60" width="110" height="120" rx="12" fill="white" stroke="var(--border-2)" strokeWidth="1.5"/>
        <text x="75" y="78" fontSize="10" fontWeight="700" fill="var(--text-2)" textAnchor="middle" fontFamily="sans-serif">기능 목록</text>
        {[86, 104, 122, 140, 158].map((y, i) => (
          <g key={y}>
            <circle cx="40" cy={y + 4.5} r="3" fill="var(--border-2)"/>
            <rect x="48" y={y} width={[62, 48, 56, 40, 52][i]} height="9" rx="4" fill="var(--border)"/>
          </g>
        ))}

        {/* 화살표 */}
        <path d="M136 120 L162 120" stroke="var(--text-2)" strokeWidth="2" strokeDasharray="4 3"/>
        <polygon points="162,115 174,120 162,125" fill="var(--text-2)"/>

        {/* 함께 만들어지는 세 문서 */}
        {rows.map((r) => (
          <g key={r.label}>
            <rect x="178" y={r.y} width="122" height="36" rx="8" fill={r.bg} opacity={r.bgOp}/>
            <rect x="188" y={r.y + 14} width={r.bar} height="7" rx="3" fill={r.bg} opacity={r.barOp}/>
            <text x="262" y={r.y + 22} fontSize="9" fontWeight="800" fill={r.text} fontFamily="sans-serif">{r.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** 정합성 자동 검증 — 기능·API·테이블을 잇고, 어긋난 연결 하나를 찾아 표시한다. */
function ConsistencyIllus() {
  const node = (x, y, label, w1, w2) => (
    <g>
      <rect x={x} y={y} width="96" height="52" rx="10" fill="white" stroke="var(--border-2)" strokeWidth="1.5"/>
      <text x={x + 14} y={y + 20} fontSize="10" fontWeight="700" fill="var(--text-2)" fontFamily="sans-serif">{label}</text>
      <rect x={x + 14} y={y + 28} width={w1} height="7" rx="3" fill="var(--border)"/>
      <rect x={x + 14 + w1 + 6} y={y + 28} width={w2} height="7" rx="3" fill="var(--border)"/>
    </g>
  );
  return (
    <div className="al-pipe-illus">
      <svg width="320" height="240" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* 연결선: 이어진 곳은 실선, 어긋난 곳은 점선 */}
        <path d="M116 60 L204 60" stroke="var(--text-3)" strokeWidth="1.5"/>
        <path d="M80 86 L128 150" stroke="var(--text-3)" strokeWidth="1.5"/>
        <path d="M240 86 L192 150" stroke="var(--text-2)" strokeWidth="1.5" strokeDasharray="4 3"/>

        {node(20, 34, "기능", 30, 22)}
        {node(204, 34, "API", 24, 34)}
        {node(112, 150, "테이블", 34, 20)}

        {/* 불일치 표시 */}
        <circle cx="216" cy="118" r="10" fill="white" stroke="var(--text-2)" strokeWidth="1.5"/>
        <text x="216" y="122" fontSize="11" fontWeight="800" fill="var(--text-1)" textAnchor="middle" fontFamily="sans-serif">!</text>

        {/* 점수 배지 */}
        <rect x="232" y="168" width="70" height="38" rx="10" fill="var(--text-1)"/>
        <text x="267" y="184" fontSize="9" fontWeight="700" fill="white" opacity="0.7" textAnchor="middle" fontFamily="sans-serif">Score</text>
        <text x="267" y="198" fontSize="11" fontWeight="800" fill="white" textAnchor="middle" fontFamily="sans-serif">92 / 100</text>
      </svg>
    </div>
  );
}

/* ── 에이전트 카드 데이터 ── */
const AGENT_CARDS = [
  {
    badge:   "Search · PM Agent",
    title:   "요구사항 자동 분석",
    desc:    "자연어 PRD 문서를 분석해 시장 조사 리포트를 생성하고, 기능 목록과 MoSCoW 우선순위를 자동으로 도출합니다. 사용자는 AI가 제안한 기능 목록을 검토하고 선택하기만 하면 됩니다.",
    visual:  "v-purple",
    IllusComp: RequirementIllus,
    // 상세 내용은 pipeline phase2 에이전트의 실제 동작을 따른다
    steps: [
      { name: "Search Agent", text: "대화로 정리한 아이디어를 바탕으로 시장 규모, 사용자 불편, 관련 법규, 기술 트렌드를 웹에서 조사합니다. 조사 출처를 결과에 함께 남깁니다." },
      { name: "PM Agent", text: "PRD 초안을 기준으로 기능 목록과 MoSCoW 우선순위(Must·Should·Could·Won't)를 확정합니다. 깨진 기능명은 다시 쓰게 해서 걸러냅니다." },
    ],
    outputs: ["시장 조사 리포트", "기능 목록", "우선순위"],
  },
  {
    badge:   "PRD · API · DB Agent",
    title:   "명세 자동 생성",
    desc:    "확정된 기능 목록을 바탕으로 PRD 문서, Swagger API 명세, ERD 스키마를 동시에 자동 생성합니다. 기획부터 기술 명세까지 일관된 정보가 자동으로 연결됩니다.",
    visual:  "v-blue",
    IllusComp: SpecIllus,
    steps: [
      { name: "PRD Agent", text: "프로젝트 개요, 목표·KPI, 핵심 기능, 사용자 페르소나, MVP 범위, 기술 스택, 릴리즈 일정을 갖춘 PRD를 씁니다." },
      { name: "Feature Spec Agent", text: "PRD의 핵심 기능을 기능명세서로 확정하고 기능 ID를 고정합니다. 이후 단계는 모두 이 목록을 기준으로 설계합니다." },
      { name: "DBA · API Agent", text: "고정된 기능 목록을 받아 DB 스키마와 API 명세(OpenAPI)를 동시에 설계합니다." },
    ],
    outputs: ["PRD", "기능명세서", "ERD", "API 명세"],
  },
  {
    badge:   "QA Agent",
    title:   "정합성 자동 검증",
    desc:    "지식 그래프를 통해 기능·API·DB 간의 논리적 연결 관계를 추적하고, 불일치 이슈를 자동 탐지합니다. 정합성 스코어와 이슈 리포트를 실시간으로 제공합니다.",
    visual:  "v-green",
    IllusComp: ConsistencyIllus,
    steps: [
      { name: "QA Agent", text: "시니어 DBA·백엔드 아키텍트 관점에서 스키마와 API를 검토하고, 문제가 있으면 한 번 더 고칩니다. 기존 항목은 지우지 않고 필요한 부분만 바꿉니다." },
      { name: "교차 검증", text: "기능·API·테이블이 서로 이어지는지 확인하고, 연결이 비거나 어긋난 곳을 불일치로 표시합니다. 관계는 지식 그래프로 볼 수 있습니다." },
      { name: "PR 정합성 검사", text: "GitHub PR이 열리거나 커밋이 올라오면 명세와 코드를 비교해 정합성 점수와 리뷰를 남깁니다." },
    ],
    outputs: ["검수된 명세", "불일치 목록", "정합성 점수"],
  },
];

/* ── 상세 보기 창 ──
   브라우저 기본 dialog를 써서 ESC 닫기·포커스 가두기·배경 차단을 그대로 받는다. */
function AgentDetailDialog({ card, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (card && dialog && !dialog.open) dialog.showModal();
    if (!card && dialog?.open) dialog.close();
  }, [card]);

  return (
    <dialog
      ref={ref}
      className="al-detail"
      aria-labelledby="al-detail-title"
      onClose={onClose}
      // 창 바깥(배경)을 누르면 닫는다. 안쪽 내용 클릭은 target이 dialog가 아니다.
      onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
    >
      {card && (
        <div className="al-detail-inner">
          <button type="button" className="al-detail-close" aria-label="닫기" onClick={() => ref.current?.close()}>×</button>
          <div className="al-agent-card-badge">{card.badge}</div>
          <h3 id="al-detail-title" className="al-detail-title">{card.title}</h3>
          <ol className="al-detail-steps">
            {card.steps.map((step, i) => (
              <li key={step.name} className="al-detail-step">
                <span className="al-detail-num" aria-hidden="true">{i + 1}</span>
                <div>
                  <div className="al-detail-name">{step.name}</div>
                  <p className="al-detail-text">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="al-detail-outputs">
            <span className="al-detail-outputs-lbl">결과물</span>
            {card.outputs.map((o) => <span key={o} className="al-detail-chip">{o}</span>)}
          </div>
          <a href="/dashboard" className="al-pill-purple al-detail-cta">직접 써보기 →</a>
        </div>
      )}
    </dialog>
  );
}

/* ── 카드 컴포넌트 ── */
function AgentCard({ card, idx, onOpen }) {
  const { IllusComp } = card;
  return (
    <div className={`al-agent-card al-anim al-d${idx + 1}`}>
      {/* 텍스트 영역 */}
      <div className="al-agent-card-body">
        <div className="al-agent-card-badge">{card.badge}</div>
        <h3 className="al-agent-card-title">{card.title}</h3>
        <p className="al-agent-card-desc">{card.desc}</p>
        <button type="button" className="al-agent-card-link" aria-haspopup="dialog" onClick={onOpen}>
          자세히 보기 →
        </button>
      </div>

      {/* 비주얼 영역 */}
      <div className={`al-agent-card-visual ${card.visual}`}>
        <IllusComp />
      </div>
    </div>
  );
}

/* ── Features (exported) ── */
export function Features() {
  const [openCard, setOpenCard] = useState(null);

  return (
    <section className="al-agents al-section" id="agents">
      <div className="al-container">
        {/* 섹션 헤더 */}
        <div className="al-agents-header al-anim">
          <div className="al-agents-eyebrow">핵심 기능</div>
          <h2 className="al-agents-title">
            설계 파편화 문제를<br />
            <span className="hl">AI로 해결합니다</span>
          </h2>
          <p className="al-agents-desc">
            기획-개발 단계의 정보 불일치로 인한 재작업 비용을
            LLM과 지식 그래프의 결합으로 근본적으로 해소합니다.
          </p>
        </div>

        {/* 카드 목록 */}
        <div className="al-agent-cards">
          {AGENT_CARDS.map((card, idx) => (
            <AgentCard key={card.badge} card={card} idx={idx} onOpen={() => setOpenCard(card)} />
          ))}
        </div>
      </div>
      <AgentDetailDialog card={openCard} onClose={() => setOpenCard(null)} />
    </section>
  );
}
