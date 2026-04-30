"use client";

import { SectionHeader } from "@/components/ui";

/* ── 시각 요소 ── */
function GraphVisual() {
  return (
    <div className="vg-wrap">
      <div className="vg-node" style={{ width:40,height:40,background:"#1a1916",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:12 }}>PRD</div>
      <div className="vg-node" style={{ width:28,height:28,background:"#1a1916",top:"10%",left:"20%",fontSize:9 }}>API</div>
      <div className="vg-node" style={{ width:28,height:28,background:"#6b6960",top:"10%",right:"20%",fontSize:9 }}>DB</div>
      <div className="vg-node" style={{ width:28,height:28,background:"#1a1916",bottom:"10%",left:"20%",fontSize:9 }}>QA</div>
      <div className="vg-node" style={{ width:28,height:28,background:"var(--text-1)",bottom:"10%",right:"20%",fontSize:9 }}>UI</div>
      <svg className="vg-svg" viewBox="0 0 160 140">
        <line x1="80" y1="70" x2="36"  y2="20"  stroke="#d0cec6" strokeWidth="1.5"/>
        <line x1="80" y1="70" x2="124" y2="20"  stroke="#d0cec6" strokeWidth="1.5"/>
        <line x1="80" y1="70" x2="36"  y2="120" stroke="#d0cec6" strokeWidth="1.5"/>
        <line x1="80" y1="70" x2="124" y2="120" stroke="#d0cec6" strokeWidth="1.5"/>
      </svg>
    </div>
  );
}

function PipelineVisual() {
  return (
    <div className="pm-wrap">
      <div className="pm-row">
        <div className="pm-box" style={{ background:"#f7f6f3",borderColor:"#e4e2db",color:"#6b6960" }}>PRD 변경</div>
        <div className="pm-arr">→</div>
        <div className="pm-box">영향도 분석</div>
      </div>
      <div className="pm-row"><div className="pm-arr" style={{ marginLeft:40 }}>↓</div></div>
      <div className="pm-row">
        <div className="pm-box" style={{ background:"#f7f6f3",borderColor:"#e4e2db",color:"#6b6960" }}>API 재생성</div>
        <div className="pm-arr">+</div>
        <div className="pm-box" style={{ background:"#f7f6f3",borderColor:"#e4e2db",color:"#6b6960" }}>DB 재검토</div>
      </div>
      <div className="pm-row"><div className="pm-arr" style={{ marginLeft:40 }}>↓</div></div>
      <div className="pm-row">
        <div className="pm-box" style={{ background:"#f7f6f3",borderColor:"#e4e2db",color:"#6b6960",flex:2 }}>✅ 무결성 확인</div>
      </div>
    </div>
  );
}

function VersionVisual() {
  const rows = [
    { color:"#1a1916", label:"v1.3.0 — PRD 업데이트",  badge:"현재", badgeBg:"#e4e2db", badgeColor:"#1a1916" },
    { color:"#a8a69f", label:"v1.2.1 — API 명세 수정",  badge:"안정", badgeBg:"#f7f6f3", badgeColor:"#6b6960" },
    { color:"#9CA3AF", label:"v1.1.0 — DB 스키마 초안", badge:"이전", badgeBg:"#F9FAFB", badgeColor:"#9CA3AF" },
    { color:"#9CA3AF", label:"v1.0.0 — 최초 PRD",       badge:"이전", badgeBg:"#F9FAFB", badgeColor:"#9CA3AF" },
  ];
  return (
    <div className="vv-wrap">
      {rows.map((r) => (
        <div className="vv-row" key={r.label}>
          <div className="vv-dot" style={{ background: r.color }} />
          <div className="vv-txt">{r.label}</div>
          <div className="vv-badge" style={{ background: r.badgeBg, color: r.badgeColor }}>{r.badge}</div>
        </div>
      ))}
    </div>
  );
}

function SpecVisual() {
  const specs = [
    { icon:"📄", label:"Swagger\nAPI 문서"       },
    { icon:"🗺️", label:"Mermaid\n다이어그램"     },
    { icon:"🧪", label:"QA\n테스트케이스"         },
    { icon:"🗄️", label:"DB\n스키마"              },
  ];
  return (
    <div className="sv-wrap">
      {specs.map((s) => (
        <div className="sv-card" key={s.icon}>
          <div className="sv-icon">{s.icon}</div>
          <div className="sv-lbl" style={{ whiteSpace:"pre-line" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── 카드 데이터 ── */
const CARDS = [
  {
    variant: "v1", tag: "01 · 설계 자동화",
    title: "PRD 기반 전주기 설계 자동 생성",
    desc: "사용자의 자연어 요구사항을 분석하여 유저 플로우, API 명세, DB 스키마, QA 시나리오를 순차적으로 자동 생성합니다. 각 공정은 독립된 전문 에이전트에 의해 수행됩니다.",
    visual: <GraphVisual />, link: "#how",
  },
  {
    variant: "v2", tag: "02 · 영향도 분석",
    title: "변경 이력 기반 영향도 분석 및 무결성 시각화",
    desc: "요구사항 수정 시 하위 모듈이나 데이터베이스에 미치는 파급 효과를 지식 그래프 기반의 영향도 분석으로 가시화합니다. 버전별 이력 관리로 사이드 이펙트를 사전 시뮬레이션합니다.",
    visual: <PipelineVisual />, link: "#features",
  },
  {
    variant: "v3", tag: "03 · 버전 관리",
    title: "버전 관리 기반 표준 명세서 자동 생성",
    desc: "설계 변경 이력을 Git Commit 구조로 관리하여 버전별 스냅샷 저장 및 자유로운 롤백을 지원합니다. Swagger, Mermaid 표준 명세를 자동 생성하여 커뮤니케이션 오류를 차단합니다.",
    visual: <VersionVisual />, link: "#features",
  },
  {
    variant: "v4", tag: "04 · 멀티 에이전트",
    title: "멀티 에이전트 기반 설계 정합성 검토 및 수정 제안",
    desc: "멀티 에이전트가 기획 의도와 설계 간 논리적 모순을 탐지하여 E2E 정합성을 검수합니다. 표준 규칙과 도메인 지식에 근거한 최적의 수정안을 제시하여 설계 완성도를 높입니다.",
    visual: <SpecVisual />, link: "#how",
  },
];

export function CoreCapabilities() {
  return (
    <section className="al-section" id="core" style={{ background: "var(--bg-light)" }}>
      <div className="al-container">
        <SectionHeader
          eyebrow="핵심 역량"
          title={<>공간 관계 서비스 엔진으로<br /><span className="hl">업무 생산성 및 공간 활용도를 극대화하세요</span></>}
          center
        />
        <div className="al-core-grid">
          {CARDS.map((c, i) => (
            <div key={c.tag} className={`al-core-card al-anim al-d${i + 1}`}>
              <div className={`al-core-visual ${c.variant}`}>{c.visual}</div>
              <div className="al-core-body">
                <div className="al-core-tag">{c.tag}</div>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                <a href={c.link} className="al-core-link">더 알아보기 →</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
