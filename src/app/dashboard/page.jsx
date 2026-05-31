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
import { ProjectChatWizard, ProgressScreen } from "@/components/dashboard/ProjectChatWizard";
import { fetchProjects, fetchProjectArtifacts, enrichProjectWithArtifacts, deleteProject } from "@/lib/projectApi";

export default function DashboardPage() {
  const [activeMode,        setActiveMode]        = useState("projects");
  const [projects,          setProjects]          = useState([]);
  const [selectedProject,   setSelectedProject]   = useState(null);
  const [selectedView,      setSelectedView]      = useState(null); // "prd" | "features" | "api" | "erd" | "qa" | null
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [showWizard,        setShowWizard]        = useState(true);
  const [runningPipeline,   setRunningPipeline]   = useState(null); // { pipelineId, projectId, projectName }

  const loadArtifacts = useCallback(async (project) => {
    try {
      const artifacts = await fetchProjectArtifacts(project.id);
      if (artifacts.length > 0) {
        setSelectedProject(enrichProjectWithArtifacts(project, artifacts));
      }
    } catch (err) {
      console.error("Artifacts 로드 실패:", err);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const list = await fetchProjects();
      setProjects(list);
      if (list.length > 0 && !selectedProject) {
        const first = list[0];
        setSelectedProject(first);
        loadArtifacts(first);
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

  async function handleDeleteProject(project) {
    if (!window.confirm(`"${project.name}" 프로젝트를 삭제할까요?`)) return;
    try {
      await deleteProject(project.id);
      setProjects(prev => prev.filter(p => p.id !== project.id));
      if (selectedProject?.id === project.id) {
        setSelectedProject(null);
        setSelectedView(null);
        setShowWizard(true);
      }
    } catch (err) {
      console.error("프로젝트 삭제 실패:", err);
    }
  }

  function handleSelectProject(project) {
    setSelectedProject(project);
    setSelectedView(runningPipeline?.projectId === project.id ? null : "prd");
    setShowWizard(false);
    if (runningPipeline?.projectId !== project.id) loadArtifacts(project);
  }

  // 채팅 완료 → 파이프라인 시작, 위저드 닫기, 사이드바에 프로젝트 추가
  function handlePipelineStart(pipelineId, projectId, projectName) {
    const runningProject = {
      id: projectId, name: projectName,
      description: "", status: "running",
      prdDocument: null, dbSchema: null, apiSpec: null,
      featureList: [], marketResearch: null,
    };
    setRunningPipeline({ pipelineId, projectId, projectName });
    setProjects(prev => {
      const exists = prev.find(p => p.id === projectId);
      return exists
        ? prev.map(p => p.id === projectId ? { ...p, status: "running" } : p)
        : [runningProject, ...prev];
    });
    setSelectedProject(runningProject);
    setSelectedView(null);
    setShowWizard(false);
  }

  // 파이프라인 완료 → SSE 결과 반영 + artifacts 재조회
  async function handlePipelineComplete(pipelineResult) {
    const freshProject = {
      id:             String(pipelineResult?.projectId   ?? Date.now()),
      name:           pipelineResult?.projectName        ?? "새 프로젝트",
      description:    "",
      status:         "active",
      prdDocument:    pipelineResult?.prdDocument        ?? null,
      dbSchema:       pipelineResult?.dbSchema           ?? null,
      apiSpec:        pipelineResult?.apiSpec            ?? null,
      featureList:    pipelineResult?.featureList        ?? [],
      marketResearch: pipelineResult?.marketResearch     ?? null,
    };

    setRunningPipeline(null);
    setSelectedProject(freshProject);
    setSelectedView("prd");
    setProjects(prev => {
      const exists = prev.find(p => p.id === freshProject.id);
      if (exists) return prev.map(p => p.id === freshProject.id ? { ...p, ...freshProject } : p);
      return [freshProject, ...prev];
    });
    loadArtifacts(freshProject);
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
        onDeleteProject={handleDeleteProject}
      />

      {/* ③ 메인 콘텐츠 — 위저드 / 파이프라인 진행 / 뷰에 따라 전환 */}
      {showWizard ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ProjectChatWizard
            onPipelineStart={handlePipelineStart}
            onCancel={() => setShowWizard(false)}
          />
        </div>
      ) : runningPipeline && selectedProject?.id === runningPipeline.projectId ? (
        <div style={{ flex: 1, overflow: "hidden" }}>
          <ProgressScreen
            pipelineId={runningPipeline.pipelineId}
            onComplete={(result) => handlePipelineComplete({
              ...result,
              projectId:   runningPipeline.projectId,
              projectName: runningPipeline.projectName,
            })}
            onCancel={() => {
              setRunningPipeline(null);
              setProjects(prev => prev.filter(p => p.id !== runningPipeline.projectId));
              setSelectedProject(null);
              setShowWizard(true);
            }}
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
