/**
 * app/dashboard/page.jsx
 * ----------------------
 * Claude 스타일 레이아웃.
 *
 * 구조:
 *   [AppSidebar 240px] [AgentPanel flex:1 — 풀스크린 LLM 채팅]
 *
 * 프로젝트 목록은 백엔드 API (GET /api/projects) 에서 불러옵니다.
 * 백엔드 연동 전까지는 MOCK_PROJECTS 를 임시 사용합니다.
 * → projectApi.js 의 fetchProjects() 로 교체 예정
 */

"use client";

import { useState, useEffect } from "react";
import { AppSidebar }    from "@/components/dashboard/AppSidebar";
import { AgentPanel }    from "@/components/dashboard/AgentPanel";
import { MOCK_PROJECTS } from "@/lib/projectData";
// import { fetchProjects } from "@/lib/projectApi"; // ← 백엔드 연동 시 주석 해제

export default function DashboardPage() {
  const [projects,        setProjects]        = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  /* 프로젝트 목록 로드 */
  useEffect(() => {
    // TODO: 백엔드 연동 시 아래 주석 해제, MOCK_PROJECTS 라인 제거
    // fetchProjects()
    //   .then(setProjects)
    //   .catch(console.error)
    //   .finally(() => setIsLoadingProjects(false));

    // 임시 mock 데이터
    setProjects(MOCK_PROJECTS);
    setIsLoadingProjects(false);
  }, []);

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
        onSelectProject={setSelectedProject}
        isLoading={isLoadingProjects}
      />

      {/* 메인: 풀스크린 채팅 */}
      <AgentPanel project={selectedProject} />
    </div>
  );
}
