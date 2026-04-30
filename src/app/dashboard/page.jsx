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

import { useState, useEffect } from "react";
import { ActivityBar }  from "@/components/dashboard/ActivityBar";
import { ContextPanel } from "@/components/dashboard/ContextPanel";
import { AgentPanel }   from "@/components/dashboard/AgentPanel";

/* ── 임시 목업 프로젝트 데이터 ── */
const MOCK_PROJECTS = [
  {
    id: "p1",
    name: "Align-it MVP",
    description: "LLM 기반 정합성 자동화 플랫폼",
    status: "active",
    consistencyScore: 87,
    progress: 65,
  },
  {
    id: "p2",
    name: "커머스 플랫폼 리뉴얼",
    description: "B2C 쇼핑몰 전면 재설계",
    status: "active",
    consistencyScore: 54,
    progress: 40,
  },
  {
    id: "p3",
    name: "사내 예약 시스템",
    description: "회의실·좌석 통합 관리",
    status: "draft",
    consistencyScore: 0,
    progress: 0,
  },
  {
    id: "p4",
    name: "모바일 뱅킹 앱",
    description: "핀테크 앱 API 설계 검증",
    status: "completed",
    consistencyScore: 95,
    progress: 100,
  },
];

export default function DashboardPage() {
  const [activeMode,      setActiveMode]      = useState("projects");
  const [projects,        setProjects]        = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedView,    setSelectedView]    = useState(null); // "prd" | "features" | "api" | "erd" | "qa" | null
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    // TODO: fetchProjects() from Spring Boot API
    setProjects(MOCK_PROJECTS);
    setSelectedProject(MOCK_PROJECTS[0]);
    setIsLoadingProjects(false);
  }, []);

  // 프로젝트가 바뀌면 뷰 초기화
  function handleSelectProject(project) {
    setSelectedProject(project);
    setSelectedView(null);
  }

  return (
    <div style={{
      display:    "flex",
      height:     "100vh",
      overflow:   "hidden",
      background: "#212121",
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
      />

      {/* ③ 채팅 메인 (flex-1) */}
      <AgentPanel project={selectedProject} view={selectedView} />

      {/* ④ 우측 패널 — 추후 구현 */}
    </div>
  );
}
