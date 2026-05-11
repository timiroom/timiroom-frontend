"use client";

import { Fragment } from "react";
import { useMockProgress } from "@/hooks";
import { useAuth } from "@/context/AuthContext";
import { smoothScroll } from "@/lib/smoothScroll";

/* ── 파이프라인 행 데이터 ── */
const PIPE_ROWS = [
  {
    label: "수집",
    nodes: [
      { label: "Search Agent", active: true,  color: "#1a1916" },
      { label: "PM Agent",     active: true,  color: "#6b6960" },
    ],
  },
  {
    label: "생성",
    nodes: [
      { label: "PRD Agent",    active: true,  color: "#1a1916" },
      { label: "API Agent",    active: false, color: "#6b6960" },
      { label: "DB Agent",     active: false, color: "#a8a69f" },
    ],
  },
  {
    label: "검증",
    nodes: [
      { label: "QA Agent",     active: false, color: "#a8a69f" },
      { label: "정합성 스코어", active: true,  color: "#1a1916" },
    ],
  },
];

const MOCK_TAGS = [
  { bg: "#e4e2db", color: "#1a1916", label: "Claude 3.5" },
  { bg: "#f7f6f3", color: "#6b6960", label: "LangGraph"  },
  { bg: "#f7f6f3", color: "#6b6960", label: "Neo4j"      },
  { bg: "#f7f6f3", color: "#a8a69f", label: "Spring Boot" },
];

const HERO_STATS = [
  { num: "6",        label: "전문 AI 에이전트" },
  { num: "Full",     label: "E2E 정합성 보장"  },
  { num: "실시간",   label: "멀티에이전트 검증" },
];

/* ── 파이프라인 목업 ── */
function PipelineMockup() {
  const prog = useMockProgress(78);

  return (
    <div className="al-hero-mockup-wrap al-anim fade-only al-d3">
      <div className="al-hero-mockup">
        {/* 타이틀 바 */}
        <div className="al-mockup-bar">
          <div className="al-mockup-dots">
            <div className="al-dot al-dot-r" />
            <div className="al-dot al-dot-y" />
            <div className="al-dot al-dot-g" />
          </div>
          <div className="al-mockup-ttl">Align-it — Multi-Agent Pipeline</div>
        </div>

        {/* 바디 */}
        <div className="al-mockup-body">
          <div className="al-pipeline">
            {PIPE_ROWS.map((row) => (
              <div className="al-pipe-row" key={row.label}>
                <div className="al-pipe-lbl">{row.label}</div>
                <div className="al-pipe-nodes">
                  {row.nodes.map((n, i) => (
                    <Fragment key={n.label}>
                      <div className={`al-pnode${n.active ? " active" : ""}`}>
                        <div className="al-ndot" style={{ background: n.color }} />
                        {n.label}
                      </div>
                      {i < row.nodes.length - 1 && <span className="al-parr">→</span>}
                    </Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 정합성 스코어 */}
          <div className="al-mock-prog">
            <div className="al-mock-prog-lbl">
              <span>정합성 스코어</span>
              <span style={{ fontWeight: 700, color: "#1a1916" }}>
                {Math.round(prog)} / 100
              </span>
            </div>
            <div className="al-mock-prog-bar">
              <div className="al-mock-prog-fill" style={{ width: `${prog}%` }} />
            </div>
          </div>

          {/* 기술 태그 */}
          <div className="al-mock-tags">
            {MOCK_TAGS.map((t) => (
              <span key={t.label} className="al-mock-tag" style={{ background: t.bg, color: t.color }}>
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hero (exported) ── */
export function Hero() {
  const { isLoggedIn, openAuthModal } = useAuth();

  return (
    <section className="al-hero" id="hero">
      {/* 배경 블롭 */}
      <div className="al-hero-bg">
        <div className="al-hero-blob b1" />
        <div className="al-hero-blob b2" />
        <div className="al-hero-blob b3" />
      </div>

      {/* 중앙 콘텐츠 */}
      <div className="al-hero-inner">
        {/* 배지 */}
        <div className="al-hero-badge al-anim">
          <div className="al-badge-dot" />
          2026 한이음 드림업 프로젝트
        </div>

        {/* 헤드라인 */}
        <h1 className="al-hero-title al-anim al-d1">
          기획과 개발의<br />
          <span className="al-hl-purple">정합성</span>을 자동으로
        </h1>

        {/* 서브텍스트 */}
        <p className="al-hero-sub al-anim al-d2">
          PRD부터 QA까지, <strong>6개의 전문 에이전트</strong>가 설계 일관성을 실시간으로 검증합니다.
          기획·API·DB·QA 문서 파편화 문제를 AI로 근본적으로 해소합니다.
        </p>

        {/* CTA 버튼 */}
        <div className="al-hero-actions al-anim al-d2">
          {isLoggedIn ? (
            <a href="/dashboard" className="al-pill-purple">
              대시보드로 이동 →
            </a>
          ) : (
            <button className="al-pill-purple" onClick={openAuthModal}>
              무료로 시작하기 →
            </button>
          )}
          <a href="#agents" className="al-pill-white" onClick={smoothScroll("#agents")}>
            주요 기능 보기
          </a>
        </div>

        {/* 통계 */}
        <div className="al-hero-stats al-anim al-d3">
          {HERO_STATS.map((s) => (
            <div className="al-stat-item" key={s.label}>
              <span className="al-stat-num">{s.num}</span>
              <span className="al-stat-lbl">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 파이프라인 목업 */}
      <div style={{ width: "100%", maxWidth: 900, margin: "0 auto 80px", padding: "0 40px", position: "relative", zIndex: 1 }}>
        <PipelineMockup />
      </div>
    </section>
  );
}
