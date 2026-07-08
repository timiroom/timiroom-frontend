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
import { TeamSetupPanel }      from "@/components/dashboard/TeamSetupPanel";
import { fetchProjects, fetchProjectArtifacts, enrichProjectWithArtifacts, deleteProject } from "@/lib/projectApi";

const SYNC_TARGETS = ["features", "api", "erd"];
const DOC_IDS = ["prd", "features", "api", "erd"];

function withSynchronizedChatArtifacts(project) {
  if (!project) return project;

  const syncedFeature = {
    name: "실시간 채팅 및 알림",
    priority: "P1",
    description: "팀원이 문서 변경 내용을 즉시 확인하고 관련 알림을 받을 수 있는 협업 기능",
    requirements: ["채팅방 자동 생성", "문서 변경 알림", "메시지 내역 저장"],
  };

  const existingFeatures = project.prdDocument?.coreFeatures || [];
  const hasFeature = existingFeatures.some(feature => feature.name?.includes("실시간 채팅"));
  const prdDocument = {
    ...(project.prdDocument || { projectOverview: project.name || "프로젝트", coreFeatures: [] }),
    coreFeatures: hasFeature ? existingFeatures : [...existingFeatures, syncedFeature],
  };

  const featureList = project.featureList?.some(item => item.includes("실시간 채팅"))
    ? project.featureList
    : [...(project.featureList || []), "실시간 채팅 및 알림"];

  const existingEndpoints = project.apiSpec?.endpoints || [];
  const hasChatEndpoint = existingEndpoints.some(endpoint => endpoint.path?.includes("/chat/messages"));
  const apiSpec = {
    ...(project.apiSpec || {}),
    endpoints: hasChatEndpoint ? existingEndpoints : [
      ...existingEndpoints,
      {
        method: "POST",
        path: "/api/chat/messages",
        summary: "채팅 메시지 전송",
        description: "문서 변경 사항과 연결된 팀 채팅 메시지를 저장합니다.",
        request: {
          headers: { Authorization: "Bearer JWT" },
          body: { projectId: "number", documentId: "string", message: "string" },
        },
        response: {
          success: { messageId: "number", syncedAt: "ISO8601" },
        },
      },
    ],
  };

  const existingTables = project.dbSchema?.tables || [];
  const hasChatTable = existingTables.some(table => table.name === "chat_messages");
  const dbSchema = {
    ...(project.dbSchema || {}),
    tables: hasChatTable ? existingTables : [
      ...existingTables,
      {
        name: "chat_messages",
        columns: [
          { name: "id", type: "BIGINT", constraints: "PK" },
          { name: "project_id", type: "BIGINT", constraints: "FK, NOT NULL" },
          { name: "document_id", type: "VARCHAR(80)", constraints: "NOT NULL" },
          { name: "message", type: "TEXT", constraints: "NOT NULL" },
          { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL" },
        ],
        indexes: ["idx_chat_messages_project"],
      },
    ],
    relationships: [
      ...(project.dbSchema?.relationships || []),
      ...(project.dbSchema?.relationships?.some(rel => rel.includes("chat_messages"))
        ? []
        : ["projects.id ↔ chat_messages.project_id"]),
    ],
  };

  return {
    ...project,
    prdDocument,
    featureList,
    apiSpec,
    dbSchema,
  };
}

export default function DashboardPage() {
  const [activeMode,        setActiveMode]        = useState("projects");
  const [projects,          setProjects]          = useState([]);
  const [selectedProject,   setSelectedProject]   = useState(null);
  const [selectedView,      setSelectedView]      = useState(null); // "prd" | "features" | "api" | "erd" | "qa" | null
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [showWizard,        setShowWizard]        = useState(true);
  const [runningPipeline,   setRunningPipeline]   = useState(null); // { pipelineId, projectId, projectName }
  const [documentSync,      setDocumentSync]      = useState({
    status: "idle",
    source: null,
    targets: [],
    keyword: "",
    savedAt: null,
  });

  const currentTeam = selectedProject?.team || {
    name: selectedProject?.name ? `${selectedProject.name} 팀` : "",
    description: "문서와 프로젝트를 함께 관리할 협업 공간",
    created: false,
  };
  const currentInvitations = selectedProject?.invitations || [];

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
      const enhancedList = list.map(p => ({
        ...p,
        team: p.team || { name: `${p.name} 팀`, description: "문서와 프로젝트를 함께 관리할 협업 공간", created: true },
        invitations: p.invitations || []
      }));
      setProjects(enhancedList);
      if (enhancedList.length > 0 && !selectedProject) {
        const first = enhancedList[0];
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

  useEffect(() => {
    const handleMockUpdate = () => {
      setProjects(prev => {
        return prev.map(p => {
          if (p.id === selectedProject?.id) {
            const updatedProject = {
              ...p,
              prdDocument: p.prdDocument ? {
                ...p.prdDocument,
                coreFeatures: [
                  ...p.prdDocument.coreFeatures,
                  { 
                    name: "견주-펫시터 실시간 채팅", 
                    priority: "P1", 
                    description: "앱 내 실시간 메시징 기능", 
                    requirements: ["채팅방 생성", "푸시 알림 전송", "메시지 내역 저장"] 
                  }
                ]
              } : null,
              dbSchema: p.dbSchema ? {
                ...p.dbSchema,
                tables: [
                  ...p.dbSchema.tables,
                  {
                    name: "chat_messages",
                    columns: [
                      { name: "id", type: "BIGINT", constraints: "PK" },
                      { name: "walk_id", type: "BIGINT", constraints: "FK" },
                      { name: "sender_id", type: "BIGINT", constraints: "FK" },
                      { name: "message", type: "TEXT", constraints: "NOT NULL" },
                      { name: "created_at", type: "TIMESTAMP", constraints: "NOT NULL" }
                    ],
                    indexes: ["idx_chat_walk"]
                  }
                ]
              } : null,
              apiSpec: p.apiSpec ? {
                ...p.apiSpec,
                endpoints: [
                  ...p.apiSpec.endpoints,
                  {
                    method: "POST",
                    path: "/api/walk-requests/{id}/chat",
                    description: "채팅 메시지를 전송합니다.",
                    summary: "채팅 메시지 전송",
                    request: {
                      headers: { Authorization: "Bearer JWT" },
                      body: { message: "string" }
                    },
                    response: {
                      success: { messageId: "number", createdAt: "ISO8601" }
                    }
                  }
                ]
              } : null,
              featureList: p.featureList ? [...p.featureList, "견주-펫시터 실시간 채팅 및 알림"] : []
            };
            setSelectedProject(updatedProject);
            return updatedProject;
          }
          return p;
        });
      });
    };
    window.addEventListener("mockFeatureAdd", handleMockUpdate);
    return () => window.removeEventListener("mockFeatureAdd", handleMockUpdate);
  }, [selectedProject?.id]);

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
    setActiveMode("projects");
    setDocumentSync({ status: "idle", source: null, targets: [], keyword: "", savedAt: null });
    if (runningPipeline?.projectId !== project.id) loadArtifacts(project);
  }

  function handleCreateTeam(nextTeam) {
    if (!selectedProject) return;
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        const updated = { ...p, team: { ...p.team, ...nextTeam, created: true } };
        setSelectedProject(updated);
        return updated;
      }
      return p;
    }));
  }

  function handleInviteMember(member) {
    if (!selectedProject) return;
    const invite = {
      ...member,
      id: `invite-${Date.now()}`,
      status: "초대 발송",
      sentAt: "방금 전",
    };
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        const updated = { ...p, invitations: [invite, ...(p.invitations || [])] };
        setSelectedProject(updated);
        return updated;
      }
      return p;
    }));
  }

  function handleAcceptInvite(inviteId) {
    if (!selectedProject) return;
    setProjects(prev => prev.map(p => {
      if (p.id === selectedProject.id) {
        const updated = {
          ...p,
          invitations: (p.invitations || []).map(inv =>
            inv.id === inviteId ? { ...inv, status: "참여 완료" } : inv
          )
        };
        setSelectedProject(updated);
        return updated;
      }
      return p;
    }));
  }

  function handlePrdSave() {
    if (!selectedProject) return;

    const savedAt = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    setDocumentSync({
      status: "syncing",
      source: "prd",
      targets: SYNC_TARGETS,
      keyword: "실시간 채팅",
      savedAt,
    });

    setProjects(prev => prev.map(project => (
      project.id === selectedProject.id ? withSynchronizedChatArtifacts(project) : project
    )));
    setSelectedProject(prev => withSynchronizedChatArtifacts(prev));

    window.setTimeout(() => {
      setDocumentSync({
        status: "done",
        source: "prd",
        targets: SYNC_TARGETS,
        keyword: "실시간 채팅",
        savedAt,
      });
    }, 1100);
  }

  function handleDocumentSave(source) {
    if (!selectedProject) return;
    if (source === "prd") {
      handlePrdSave();
      return;
    }

    const savedAt = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    const targets = DOC_IDS.filter(docId => docId !== source);
    setDocumentSync({
      status: "syncing",
      source,
      targets,
      keyword: source === "features" ? "실시간 채팅" : "chat_messages",
      savedAt,
    });

    window.setTimeout(() => {
      setDocumentSync({
        status: "done",
        source,
        targets,
        keyword: source === "features" ? "실시간 채팅" : "chat_messages",
        savedAt,
      });
    }, 1100);
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
    setDocumentSync({ status: "idle", source: null, targets: [], keyword: "", savedAt: null });
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
        team={currentTeam}
        invitations={currentInvitations}
        documentSync={documentSync}
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
      ) : selectedView === "team" || activeMode === "team" ? (
        selectedProject ? (
          <TeamSetupPanel
            team={currentTeam}
            invitations={currentInvitations}
            onCreateTeam={handleCreateTeam}
            onInviteMember={handleInviteMember}
            onAcceptInvite={handleAcceptInvite}
          />
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 15, fontWeight: 600 }}>
            우측 패널이나 프로젝트 탭에서 새로운 프로젝트를 먼저 생성해 주세요.
          </div>
        )
      ) : selectedView === "prd" ? (
        <PrdPanel      project={selectedProject} syncState={documentSync} onSave={() => handleDocumentSave("prd")} />
      ) : selectedView === "features" ? (
        <FeaturesPanel project={selectedProject} syncState={documentSync} onSave={() => handleDocumentSave("features")} />
      ) : selectedView === "api" ? (
        <ApiSpecPanel  project={selectedProject} syncState={documentSync} onSave={() => handleDocumentSave("api")} />
      ) : selectedView === "erd" ? (
        <ErdPanel      project={selectedProject} syncState={documentSync} onSave={() => handleDocumentSave("erd")} />
      ) : (
        <AgentPanel    project={selectedProject} view={selectedView} />
      )}

      {/* ④ 우측 패널 — 추후 구현 */}
    </div>
  );
}
