/**
 * app/dashboard/page.jsx
 * ----------------------
 * 대시보드 진입점.
 *
 * 레이아웃: [좌측 콘텐츠 영역] + [우측 AgentPanel — 항상 표시]
 *
 * 상태 머신 (좌측):
 *   isCreating === true      →  CreateProjectWizard
 *   selectedProject === null →  ProjectsShell (프로젝트 그리드)
 *   selectedProject !== null →  DashboardLayout (사이드바 + 뷰)
 */

"use client";

import { useState } from "react";
import {
  DashboardLayout,
  ProjectsListPage,
  CreateProjectWizard,
  AgentPanel,
  OverviewPanel,
  KnowledgeGraph,
  PipelineView,
} from "@/components/dashboard";
import { MOCK_PROJECTS } from "@/lib/projectData";

/* ── 뷰 레지스트리 ── */
const VIEWS = {
  overview: OverviewPanel,
  graph:    KnowledgeGraph,
  pipeline: PipelineView,
};

/* ══════════════════════════════════════
   좌측 콘텐츠 뷰들
══════════════════════════════════════ */

function ProjectsShell({ onSelectProject, onCreateProject, projects }) {
  return (
    <div className="db-root" style={{ flex: 1, minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <div className="db-orb db-orb-1" style={{ top: "-5%",  left: "20%",  zIndex: 0 }}/>
      <div className="db-orb db-orb-2" style={{ bottom: "5%",right: "10%", zIndex: 0 }}/>
      <div className="db-orb db-orb-3" style={{ top: "40%",  left: "55%",  zIndex: 0 }}/>

      <header style={{
        height: 60, padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--db-bg-surface)", borderBottom: "1px solid var(--db-border)",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: "var(--db-grad-purple)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 900, color: "white",
            boxShadow: "var(--db-glow-md)",
          }}>A</div>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--db-purple-300)" }}>Align-it</span>
        </div>
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

      <main style={{
        padding: "36px 40px",
        background: "linear-gradient(180deg, var(--db-bg-primary) 0%, var(--db-bg-base) 100%)",
        minHeight: "calc(100vh - 60px)", position: "relative", zIndex: 1,
      }}>
        <ProjectsListPage
          onSelectProject={onSelectProject}
          onCreateProject={onCreateProject}
          projects={projects}
        />
      </main>
    </div>
  );
}

function WizardShell({ onComplete, onCancel }) {
  return (
    <div className="db-root" style={{ flex: 1, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <CreateProjectWizard onComplete={onComplete} onCancel={onCancel} />
    </div>
  );
}

/* ══════════════════════════════════════
   메인 페이지
══════════════════════════════════════ */
export default function DashboardPage() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeView,      setActiveView]       = useState("overview");
  const [isCreating,      setIsCreating]       = useState(false);
  const [projects,        setProjects]         = useState(MOCK_PROJECTS);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setActiveView("overview");
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setActiveView("overview");
  };

  const handleWizardComplete = (wizardData) => {
    const newProject = {
      id:           `proj-${Date.now()}`,
      name:         wizardData.name,
      description:  wizardData.description,
      status:       "draft",
      score:        0,
      progress:     0,
      tags:         wizardData.techStack.slice(0, 3),
      members:      ["M"],
      lastActivity: "방금 전",
      created:      new Date().toISOString().split("T")[0],
      prdCount:     0,
      issueCount:   0,
      specCount:    0,
      color:        "#7C3AED",
      implType:     wizardData.implType,
      _wizardData:  wizardData,
    };
    setProjects(prev => [newProject, ...prev]);
    setIsCreating(false);
    setSelectedProject(newProject);
    setActiveView("overview");
  };

  /* 좌측 뷰 렌더 */
  const renderMain = () => {
    if (isCreating) {
      return (
        <WizardShell
          onComplete={handleWizardComplete}
          onCancel={() => setIsCreating(false)}
        />
      );
    }

    if (!selectedProject) {
      return (
        <ProjectsShell
          onSelectProject={handleSelectProject}
          onCreateProject={() => setIsCreating(true)}
          projects={projects}
        />
      );
    }

    const ActiveView = VIEWS[activeView];
    return (
      <DashboardLayout
        activeView={activeView}
        onViewChange={setActiveView}
        project={selectedProject}
        projects={projects}
        onBackToList={handleBackToList}
      >
        {ActiveView
          ? <ActiveView project={selectedProject}/>
          : <ComingSoon view={activeView}/>
        }
      </DashboardLayout>
    );
  };

  /* ── 전체 레이아웃: 좌측 콘텐츠 + 우측 AgentPanel ── */
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* 좌측: 메인 콘텐츠 (flex: 1, 스크롤 허용) */}
      <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {renderMain()}
      </div>

      {/* 우측: Agent 패널 (항상 표시) */}
      <AgentPanel project={selectedProject} />
    </div>
  );
}

function ComingSoon({ view }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "60vh", gap: 12,
    }}>
      <div style={{ fontSize: 48 }}>🚧</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "var(--db-text-primary)" }}>{view} 준비 중</div>
      <div style={{ fontSize: 14, color: "var(--db-text-muted)" }}>곧 추가될 예정입니다.</div>
    </div>
  );
}
