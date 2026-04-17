/**
 * app/dashboard/page.jsx
 * ----------------------
 * 대시보드 진입점.
 *
 * 상태 머신:
 *   selectedProject === null  →  ProjectsListPage (프로젝트 카드 그리드)
 *   selectedProject !== null  →  DashboardLayout  (사이드바 + 뷰 탭)
 *
 * 새 페이지 추가 방법:
 *   1. src/components/dashboard/ 에 컴포넌트 생성
 *   2. dashboard/index.js 에 export 추가
 *   3. VIEWS 객체에 등록
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DashboardLayout,
  ProjectsListPage,
  OverviewPanel,
  KnowledgeGraph,
  PipelineView,
} from "@/components/dashboard";

/* ── 뷰 레지스트리: 새 뷰 추가 시 여기에만 등록 ── */
const VIEWS = {
  overview: OverviewPanel,
  graph:    KnowledgeGraph,
  pipeline: PipelineView,
  // specs: SpecsView,     ← 추후 추가
  // prd:   PrdInputView,  ← 추후 추가
};

/* ── 프로젝트 목록 래퍼 (다크 배경 적용) ── */
function ProjectsShell({ onSelectProject }) {
  return (
    <div className="db-root" style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Anti-Gravity 배경 orb */}
      <div className="db-orb db-orb-1" style={{ top: "-5%",  left: "20%",  zIndex: 0 }}/>
      <div className="db-orb db-orb-2" style={{ bottom: "5%",right: "10%", zIndex: 0 }}/>
      <div className="db-orb db-orb-3" style={{ top: "40%",  left: "55%",  zIndex: 0 }}/>

      {/* 상단 헤더 */}
      <header style={{
        height: 60, padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--db-bg-surface)", borderBottom: "1px solid var(--db-border)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: "var(--db-grad-purple)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 900, color: "white",
            boxShadow: "var(--db-glow-md)",
          }}>A</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--db-purple-300)" }}>Align-it</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "var(--db-bg-elevated)", border: "1px solid var(--db-border)",
            borderRadius: "var(--db-radius-sm)", padding: "6px 12px",
            color: "var(--db-text-muted)", fontSize: 12, cursor: "pointer",
          }}>
            <span>🔍</span><span>검색...</span>
            <span style={{ background: "var(--db-bg-surface)", borderRadius: 4, padding: "1px 5px", fontSize: 10 }}>⌘K</span>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--db-grad-purple)", boxShadow: "var(--db-glow-sm)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "white", cursor: "pointer",
          }}>M</div>
        </div>
      </header>

      {/* 본문 */}
      <main style={{
        padding: "36px 40px",
        background: "linear-gradient(180deg, var(--db-bg-primary) 0%, var(--db-bg-base) 100%)",
        minHeight: "calc(100vh - 60px)", position: "relative", zIndex: 1,
      }}>
        <ProjectsListPage onSelectProject={onSelectProject}/>
      </main>
    </div>
  );
}

/* ── 메인 페이지 컴포넌트 ── */
export default function DashboardPage() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeView,      setActiveView]       = useState("overview");

  /* 프로젝트 선택 */
  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setActiveView("overview"); // 진입 시 항상 Overview 탭
  };

  /* 프로젝트 목록으로 복귀 */
  const handleBackToList = () => {
    setSelectedProject(null);
    setActiveView("overview");
  };

  /* 프로젝트 미선택 → 목록 화면 */
  if (!selectedProject) {
    return <ProjectsShell onSelectProject={handleSelectProject}/>;
  }

  /* 프로젝트 선택 → 워크스페이스 */
  const ActiveView = VIEWS[activeView];

  return (
    <DashboardLayout
      activeView={activeView}
      onViewChange={setActiveView}
      project={selectedProject}
      onBackToList={handleBackToList}
    >
      {ActiveView
        ? <ActiveView project={selectedProject}/>
        : <ComingSoon view={activeView}/>
      }
    </DashboardLayout>
  );
}

function ComingSoon({ view }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12 }}>
      <div style={{ fontSize: 48 }}>🚧</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--db-text-primary)" }}>{view} 준비 중</div>
      <div style={{ fontSize: 14, color: "var(--db-text-muted)" }}>곧 추가될 예정입니다.</div>
    </div>
  );
}
