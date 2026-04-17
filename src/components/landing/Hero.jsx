"use client";

import { useMockProgress } from "@/hooks";
import { Button } from "@/components/ui";
import { smoothScroll } from "@/lib/smoothScroll";

/* ── 상수 데이터 ── */
const HERO_STATS = [
  { num: "80%",        label: "설계 오류 수정 비용 절감" },
  { num: "Full Cycle", label: "E2E 설계 정합성 보장"   },
  { num: "실시간",      label: "멀티 에이전트 검증"     },
];

const PIPE_ROWS = [
  {
    label: "PRD",
    nodes: [
      { label: "PM Agent",  active: true,  color: "#6B5CE7" },
      { label: "DBA Agent", active: false, color: "#3B82F6" },
      { label: "API Agent", active: false, color: "#10B981" },
    ],
  },
  {
    label: "검증",
    nodes: [
      { label: "QA Agent",  active: false, color: "#F59E0B" },
      { label: "검증 엔진",  active: true,  color: "#6B5CE7" },
      { label: "Swagger",   active: false, color: "#10B981" },
    ],
  },
  {
    label: "시각화",
    nodes: [
      { label: "지식 그래프", active: false, color: "#EC4899" },
      { label: "React Flow",  active: true,  color: "#6B5CE7" },
    ],
  },
];

const MOCK_TAGS = [
  { bg: "#EDE9FE", color: "#6B5CE7", label: "GPT-4o"      },
  { bg: "#EFF6FF", color: "#3B82F6", label: "LangGraph"   },
  { bg: "#F0FDF4", color: "#16A34A", label: "Neo4j"       },
  { bg: "#FFF7ED", color: "#EA580C", label: "Spring Boot" },
];

/* ── Sub-components ── */
function HeroMockup() {
  const progWidth = useMockProgress(72);

  return (
    <div style={{ position: "relative" }}>
      {/* Floating badge — top */}
      <div className="al-float-badge al-fb-top">
        <div className="al-fb-icon" style={{ background: "#EDE9FE" }}>✅</div>
        <div>
          <div className="al-fb-main">정합성 검증 완료</div>
          <div className="al-fb-sub">API 명세 · DB 스키마 · QA</div>
        </div>
      </div>

      {/* Mockup window */}
      <div className="al-mockup">
        <div className="al-mockup-bar">
          <div className="al-mockup-dots">
            <div className="al-dot al-dot-r" />
            <div className="al-dot al-dot-y" />
            <div className="al-dot al-dot-g" />
          </div>
          <div className="al-mockup-ttl">Align-it — Multi-Agent Pipeline</div>
        </div>

        <div className="al-mockup-body">
          {/* Pipeline rows */}
          <div className="al-pipeline">
            {PIPE_ROWS.map((row) => (
              <div className="al-pipe-row" key={row.label}>
                <div className="al-pipe-lbl">{row.label}</div>
                <div className="al-pipe-nodes">
                  {row.nodes.map((n, i) => (
                    <>
                      <div
                        key={n.label}
                        className={`al-pnode${n.active ? " active" : ""}`}
                      >
                        <div className="al-ndot" style={{ background: n.color }} />
                        {n.label}
                      </div>
                      {i < row.nodes.length - 1 && (
                        <span key={`a${i}`} className="al-parr">→</span>
                      )}
                    </>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="al-mock-prog">
            <div className="al-mock-prog-lbl">
              <span>정합성 스코어</span>
              <span style={{ fontWeight: 700, color: "#6B5CE7" }}>
                {Math.round(progWidth)} / 100
              </span>
            </div>
            <div className="al-mock-prog-bar">
              <div className="al-mock-prog-fill" style={{ width: `${progWidth}%` }} />
            </div>
          </div>

          {/* Tags */}
          <div className="al-mock-tags">
            {MOCK_TAGS.map((t) => (
              <span
                key={t.label}
                className="al-mock-tag"
                style={{ background: t.bg, color: t.color }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badge — bottom */}
      <div className="al-float-badge al-fb-bottom">
        <div className="al-fb-icon" style={{ background: "#F0FDF4" }}>🔗</div>
        <div>
          <div className="al-fb-main">지식 그래프 연결</div>
          <div className="al-fb-sub">23개 노드 · 48개 엣지</div>
        </div>
      </div>
    </div>
  );
}

/* ── Hero (exported) ── */
export function Hero() {
  return (
    <section className="al-hero" id="hero">
      {/* Background floating nodes */}
      <div className="al-hero-bg">
        {[...Array(5)].map((_, i) => <div key={i} className="al-hero-node" />)}
      </div>

      <div className="al-container">
        <div className="al-hero-inner">
          {/* Left — copy */}
          <div>
            <div className="al-hero-badge al-anim">
              <div className="al-badge-dot" />
              2026 한이음 드림업 프로젝트
            </div>
            <h1 className="al-hero-title al-anim al-d1">
              기획과 개발의<br />
              <span className="al-grad-text">정합성,</span><br />
              AI로 완성합니다
            </h1>
            <p className="al-hero-sub al-anim al-d2">
              LLM과 지식 그래프를 결합한 오케스트레이션 플랫폼.
              PRD부터 QA 시나리오까지, 멀티 에이전트가 전 주기의
              설계 일관성을 실시간으로 검증합니다.
            </p>
            <div className="al-hero-actions al-anim al-d3">
              <Button variant="primary" size="lg" href="#start" onClick={smoothScroll("#start")}>
                무료로 시작하기 →
              </Button>
              <Button variant="outline" size="lg" href="#how" onClick={smoothScroll("#how")}>
                작동방식 보기
              </Button>
            </div>
            <div className="al-hero-stats al-anim al-d4">
              {HERO_STATS.map((s) => (
                <div className="al-stat-item" key={s.label}>
                  <span className="al-stat-num">{s.num}</span>
                  <span className="al-stat-lbl">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — mockup */}
          <div className="al-hero-visual al-anim fade-only al-d2">
            <HeroMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
