"use client";

/* ── SVG 일러스트레이션 ── */
function PurpleIllus() {
  return (
    <div className="al-pipe-illus">
      <svg width="320" height="240" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* PRD 문서 카드 */}
        <rect x="20" y="60" width="110" height="120" rx="12" fill="white" stroke="#d0cec6" strokeWidth="1.5"/>
        <rect x="36" y="82" width="78" height="9" rx="4" fill="#e4e2db"/>
        <rect x="36" y="100" width="58" height="9" rx="4" fill="#e4e2db"/>
        <rect x="36" y="118" width="68" height="9" rx="4" fill="#e4e2db"/>
        <rect x="36" y="136" width="50" height="9" rx="4" fill="#e4e2db"/>
        <rect x="36" y="154" width="62" height="9" rx="4" fill="#e4e2db"/>
        <text x="75" y="78" fontSize="10" fontWeight="700" fill="#6b6960" textAnchor="middle" fontFamily="sans-serif">PRD</text>

        {/* 화살표 */}
        <path d="M136 118 L162 118" stroke="#6b6960" strokeWidth="2" strokeDasharray="4 3"/>
        <polygon points="162,113 174,118 162,123" fill="#6b6960"/>

        {/* MoSCoW 우선순위 */}
        <rect x="178" y="44" width="122" height="34" rx="8" fill="#1a1916" opacity="0.15"/>
        <rect x="188" y="55" width="50" height="7" rx="3" fill="#1a1916" opacity="0.7"/>
        <text x="260" y="64" fontSize="9" fontWeight="800" fill="#1a1916" fontFamily="sans-serif">Must</text>

        <rect x="178" y="86" width="122" height="34" rx="8" fill="#6b6960" opacity="0.12"/>
        <rect x="188" y="97" width="65" height="7" rx="3" fill="#6b6960" opacity="0.6"/>
        <text x="260" y="106" fontSize="9" fontWeight="800" fill="#6b6960" fontFamily="sans-serif">Should</text>

        <rect x="178" y="128" width="122" height="34" rx="8" fill="#1a1916" opacity="0.1"/>
        <rect x="188" y="139" width="48" height="7" rx="3" fill="#1a1916" opacity="0.5"/>
        <text x="260" y="148" fontSize="9" fontWeight="800" fill="#1a1916" fontFamily="sans-serif">Could</text>

        <rect x="178" y="170" width="122" height="34" rx="8" fill="#9ca3af" opacity="0.12"/>
        <rect x="188" y="181" width="58" height="7" rx="3" fill="#9ca3af" opacity="0.5"/>
        <text x="260" y="190" fontSize="9" fontWeight="800" fill="#9ca3af" fontFamily="sans-serif">Won&apos;t</text>
      </svg>
    </div>
  );
}

function BlueIllus() {
  return (
    <div className="al-pipe-illus">
      <svg width="320" height="240" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* API 명세 박스 */}
        <rect x="20" y="28" width="130" height="80" rx="10" fill="white" stroke="#e4e2db" strokeWidth="1.5"/>
        <text x="32" y="50" fontSize="10" fontWeight="800" fill="#6b6960" fontFamily="monospace">GET /features</text>
        <text x="32" y="67" fontSize="9" fill="#6b7280" fontFamily="monospace">200 OK → Feature[]</text>
        <text x="32" y="84" fontSize="10" fontWeight="800" fill="#a8a69f" fontFamily="monospace">POST /pipeline</text>
        <text x="32" y="100" fontSize="9" fill="#6b7280" fontFamily="monospace">201 Created</text>

        {/* DB 스키마 박스 */}
        <rect x="20" y="132" width="130" height="80" rx="10" fill="white" stroke="#e4e2db" strokeWidth="1.5"/>
        <text x="32" y="154" fontSize="9" fontWeight="700" fill="#6b6960" fontFamily="monospace">TABLE features</text>
        <rect x="32" y="162" width="45" height="6" rx="3" fill="#e4e2db"/>
        <rect x="82" y="162" width="55" height="6" rx="3" fill="#d1fae5"/>
        <text x="32" y="182" fontSize="9" fontWeight="700" fill="#6b6960" fontFamily="monospace">TABLE api_specs</text>
        <rect x="32" y="190" width="40" height="6" rx="3" fill="#e4e2db"/>
        <rect x="78" y="190" width="50" height="6" rx="3" fill="#d1fae5"/>

        {/* 연결선 */}
        <path d="M155 68 L192 68 L192 120 M155 172 L192 172 L192 120" stroke="#93c5fd" strokeWidth="1.5" strokeDasharray="4 3"/>
        <circle cx="192" cy="120" r="7" fill="#6b6960" opacity="0.25"/>
        <circle cx="192" cy="120" r="3.5" fill="#6b6960"/>

        {/* 정합성 체크 */}
        <rect x="210" y="100" width="90" height="40" rx="10" fill="#f7f6f3"/>
        <text x="255" y="118" fontSize="9" fontWeight="700" fill="#6b6960" textAnchor="middle" fontFamily="sans-serif">정합성 연결</text>
        <text x="255" y="130" fontSize="11" fontWeight="800" fill="#6b6960" textAnchor="middle" fontFamily="sans-serif">✓ 확인됨</text>
      </svg>
    </div>
  );
}

function GreenIllus() {
  return (
    <div className="al-pipe-illus">
      <svg width="320" height="240" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Feature 노드 */}
        <circle cx="80"  cy="85"  r="34" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5"/>
        <text x="80"  y="80"  fontSize="9" fontWeight="700" fill="#065f46" textAnchor="middle" fontFamily="sans-serif">Feature</text>
        <text x="80"  y="93"  fontSize="8" fill="#065f46" textAnchor="middle" fontFamily="sans-serif">로그인</text>

        {/* API 노드 */}
        <circle cx="230" cy="85"  r="34" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5"/>
        <text x="230" y="80"  fontSize="9" fontWeight="700" fill="#1e3a8a" textAnchor="middle" fontFamily="sans-serif">API</text>
        <text x="230" y="93"  fontSize="8" fill="#1e3a8a" textAnchor="middle" fontFamily="sans-serif">POST /auth</text>

        {/* ERD 노드 */}
        <circle cx="155" cy="180" r="34" fill="#e4e2db" stroke="#d0cec6" strokeWidth="1.5"/>
        <text x="155" y="175" fontSize="9" fontWeight="700" fill="#1a1916" textAnchor="middle" fontFamily="sans-serif">ERD</text>
        <text x="155" y="188" fontSize="8" fill="#1a1916" textAnchor="middle" fontFamily="sans-serif">users</text>

        {/* 엣지 */}
        <line x1="114" y1="85" x2="196" y2="85" stroke="#6ee7b7" strokeWidth="2"/>
        <text x="155" y="80"  fontSize="8" fill="#065f46" textAnchor="middle" fontFamily="sans-serif">IMPLEMENTS</text>

        <line x1="98"  y1="112" x2="134" y2="154" stroke="#93c5fd" strokeWidth="2"/>
        <text x="100" y="140" fontSize="8" fill="#1e3a8a" fontFamily="sans-serif">STORES</text>

        <line x1="212" y1="112" x2="176" y2="154" stroke="#d0cec6" strokeWidth="2"/>
        <text x="200" y="140" fontSize="8" fill="#1a1916" fontFamily="sans-serif">USES</text>

        {/* 스코어 뱃지 */}
        <rect x="240" y="175" width="70" height="38" rx="10" fill="#1a1916"/>
        <text x="275" y="192" fontSize="9" fontWeight="800" fill="white" textAnchor="middle" fontFamily="sans-serif">Score</text>
        <text x="275" y="205" fontSize="11" fontWeight="800" fill="white" textAnchor="middle" fontFamily="sans-serif">92 / 100</text>
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
    IllusComp: PurpleIllus,
  },
  {
    badge:   "PRD · API · DB Agent",
    title:   "명세 자동 생성",
    desc:    "확정된 기능 목록을 바탕으로 PRD 문서, Swagger API 명세, ERD 스키마를 동시에 자동 생성합니다. 기획부터 기술 명세까지 일관된 정보가 자동으로 연결됩니다.",
    visual:  "v-blue",
    IllusComp: BlueIllus,
  },
  {
    badge:   "QA Agent",
    title:   "정합성 자동 검증",
    desc:    "지식 그래프를 통해 기능·API·DB 간의 논리적 연결 관계를 추적하고, 불일치 이슈를 자동 탐지합니다. 정합성 스코어와 이슈 리포트를 실시간으로 제공합니다.",
    visual:  "v-green",
    IllusComp: GreenIllus,
  },
];

/* ── 카드 컴포넌트 ── */
function AgentCard({ card, idx }) {
  const { IllusComp } = card;
  return (
    <div className={`al-agent-card al-anim al-d${idx + 1}`}>
      {/* 텍스트 영역 */}
      <div className="al-agent-card-body">
        <div className="al-agent-card-badge">{card.badge}</div>
        <h3 className="al-agent-card-title">{card.title}</h3>
        <p className="al-agent-card-desc">{card.desc}</p>
        <div className="al-agent-card-link">
          자세히 보기 →
        </div>
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
            <AgentCard key={card.badge} card={card} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}
