/**
 * app/dashboard/page.jsx
 *
 * 4패널 레이아웃 (피그마 Frame 9 기준):
 *   [ActivityBar 56px] | [ContextPanel 260px] | [AgentPanel flex-1] | [RightPanel TBD]
 *
 * ActivityBar 아이콘:
 *   - projects → ContextPanel에 프로젝트 목록 표시
 *   - commit   → ContextPanel에 커밋 히스토리 + 커밋 폼 표시
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { ActivityBar }         from "@/components/dashboard/ActivityBar";
import { ContextPanel }        from "@/components/dashboard/ContextPanel";
import { AgentPanel }          from "@/components/dashboard/AgentPanel";
import { ApiSpecPanel }        from "@/components/dashboard/ApiSpecPanel";
import { PrdPanel }            from "@/components/dashboard/PrdPanel";
import { FeaturesPanel }       from "@/components/dashboard/FeaturesPanel";
import { ErdPanel }            from "@/components/dashboard/ErdPanel";
import { CreateProjectWizard } from "@/components/dashboard/CreateProjectWizard";
import { fetchProjects }       from "@/lib/projectApi";

export default function DashboardPage() {
  const [activeMode,        setActiveMode]        = useState("projects");
  const [projects,          setProjects]          = useState([]);
  const [selectedProject,   setSelectedProject]   = useState(null);
  const [selectedView,      setSelectedView]      = useState(null); // "prd" | "features" | "api" | "erd" | "qa" | null
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [showWizard,        setShowWizard]        = useState(false);
  const [pipelineRunning,   setPipelineRunning]   = useState(false);

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const list = await fetchProjects();
      setProjects(list);
      if (list.length > 0 && !selectedProject) {
        setSelectedProject(list[0]);
      }
    } catch (err) {
      console.error("프로젝트 목록 로드 실패:", err);
    } finally {
      setIsLoadingProjects(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  function handleSelectProject(project) {
    setSelectedProject(project);
    setSelectedView(null);
  }

  // 위저드 완료 → 백엔드가 이미 저장한 프로젝트를 목록에 즉시 반영
  function handleWizardComplete(pipelineResult) {
    setShowWizard(false);
    setPipelineRunning(false);

    const newProject = {
      id:          pipelineResult?.projectId   ?? String(Date.now()),
      name:        pipelineResult?.projectName ?? "새 프로젝트",
      description: "",
      status:      "active",
      prdDocument: pipelineResult?.prdDocument ?? null,
      dbSchema:    pipelineResult?.dbSchema    ?? null,
      apiSpec:     pipelineResult?.apiSpec     ?? null,
      featureList: pipelineResult?.featureList ?? [],
    };

    setProjects(prev => [newProject, ...prev]);
    setSelectedProject(newProject);
  }

  return (
    <div style={{
      display:    "flex",
      height:     "100vh",
      overflow:   "hidden",
      background: "var(--surface)",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* ① 아이콘 레일 (56px) */}
      <ActivityBar
        activeMode={activeMode}
        onModeChange={setActiveMode}
      />

      {/* ② 컨텍스트 패널 (260px) */}
      <ContextPanel
        mode={activeMode}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        selectedView={selectedView}
        onSelectView={setSelectedView}
        onCreateProject={() => setShowWizard(true)}
      />

      {/* ③ 메인 콘텐츠 — 위저드 / 뷰에 따라 전환 */}
      {showWizard ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <CreateProjectWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        </div>
      ) : selectedView === "prd" ? (
        <PrdPanel      project={selectedProject} />
      ) : selectedView === "features" ? (
        <FeaturesPanel project={selectedProject} />
      ) : selectedView === "api" ? (
        <ApiSpecPanel  project={selectedProject} />
      ) : selectedView === "erd" ? (
        <ErdPanel      project={selectedProject} />
      ) : (
        <AgentPanel    project={selectedProject} view={selectedView} />
      )}

      {/* ④ 우측 패널 — 추후 구현 */}
    </div>
  );
}
