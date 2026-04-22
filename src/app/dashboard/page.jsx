/**
 * app/dashboard/page.jsx
 * ----------------------
 * Claude 스타일 레이아웃.
 *
 * 구조:
 *   [AppSidebar 240px] [AgentPanel flex:1 — 풀스크린 LLM 채팅]
 *
 * 프로젝트 생성 위저드는 전체화면 오버레이로 표시됩니다.
 */

"use client";

import { useState } from "react";
import { AppSidebar }          from "@/components/dashboard/AppSidebar";
import { AgentPanel }          from "@/components/dashboard/AgentPanel";
import { CreateProjectWizard } from "@/components/dashboard/CreateProjectWizard";
import { MOCK_PROJECTS }       from "@/lib/projectData";

export default function DashboardPage() {
  const [projects,        setProjects]        = useState(MOCK_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isCreating,      setIsCreating]      = useState(false);

  /* 프로젝트 선택 */
  const handleSelectProject = (project) => {
    setSelectedProject(project);
  };

  /* 위저드 완료 */
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
  };

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "#212121",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* 좌측 사이드바 */}
      <AppSidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        onCreateProject={() => setIsCreating(true)}
      />

      {/* 메인: 풀스크린 채팅 */}
      <AgentPanel project={selectedProject} />

      {/* 프로젝트 생성 위저드 — 전체화면 오버레이 */}
      {isCreating && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "#1a1a1a",
          display: "flex", flexDirection: "column",
        }}>
          <CreateProjectWizard
            onComplete={handleWizardComplete}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      )}
    </div>
  );
}
