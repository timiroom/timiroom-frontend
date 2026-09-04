"use client";

/**
 * app/dashboard/page.jsx
 *
 * 4패널 레이아웃:
 *   [Unified ActivityBar 80px] | [ContextPanel 280px] | [MainContent flex-1]
 *
 * 워크스페이스 기준으로 프로젝트를 묶고, 좌측 단일 레일에서 전환/생성/초대를 처리한다.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityBar } from "@/components/dashboard/ActivityBar";
import { ContextPanel } from "@/components/dashboard/ContextPanel";
import { AgentPanel } from "@/components/dashboard/AgentPanel";
import { ApiSpecPanel } from "@/components/dashboard/ApiSpecPanel";
import { PrdPanel } from "@/components/dashboard/PrdPanel";
import { FeaturesPanel } from "@/components/dashboard/FeaturesPanel";
import { ErdPanel } from "@/components/dashboard/ErdPanel";
import { ProjectKnowledgeGraph } from "@/components/dashboard/ProjectKnowledgeGraph";
import { QaTestPanel } from "@/components/dashboard/QaTestPanel";
import { ProjectChatWizard, ProgressScreen } from "@/components/dashboard/ProjectChatWizard";
import { WorkspaceComposerDialog } from "@/components/dashboard/workspace/WorkspaceComposerDialog";
import { WorkspaceManagementView } from "@/components/dashboard/workspace/WorkspaceManagementView";
import { GithubIssuesPanel } from "@/components/dashboard/GithubIssuesPanel";
import { GithubPullRequestsPanel } from "@/components/dashboard/GithubPullRequestsPanel";
import { GithubWorkspacePanel } from "@/components/dashboard/GithubWorkspacePanel";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  deleteProject,
  enrichProjectWithArtifacts,
  fetchProjectArtifacts,
  fetchProjectMembers,
  fetchProjectsByTeam,
} from "@/lib/projectApi";
import { updateArtifact } from "@/lib/pipelineApi";
import { analyzeDocumentImpact, documentLabel } from "@/lib/documentSyncApi";

const ROLE_DOCUMENT_PERMISSIONS = {
  PM:       ["PRD", "DB_SCHEMA", "API_SPEC", "FEATURE_LIST", "MARKET_RESEARCH", "QA_REPORT"],
  BACKEND:  ["DB_SCHEMA", "API_SPEC"],
  FRONTEND: ["API_SPEC", "FEATURE_LIST"],
  DESIGNER: ["PRD", "MARKET_RESEARCH", "FEATURE_LIST"],
  INFRA:    ["DB_SCHEMA"],
};

function canEditDocType(role, docType) {
  if (!role) return false;
  return ROLE_DOCUMENT_PERMISSIONS[role]?.includes(docType) ?? false;
}
import {
  createTeam,
  getActiveTeamId,
  getMyTeams,
  getPreferredTeam,
  getTeamWorkspace,
  joinTeamByInviteCode,
  regenerateTeamInviteCode,
  setActiveTeamId as persistActiveTeamId,
} from "@/lib/teamApi";

function getWorkspaceId(workspace) {
  return workspace?.teamId ?? workspace?.id ?? null;
}

/* ── 문서 탭 ── */
const DOC_LABELS = {
  prd: "PRD",
  features: "기능 명세서",
  api: "API 명세서",
  erd: "ERD 명세서",
  github: "GitHub 작업",
  issues: "Issues 전체",
  pulls: "PRs 전체",
  graph: "지식그래프",
  qa: "QA 테스트",
};

function documentTabId(projectId, view) {
  return `doc:${projectId}:${view ?? "none"}`;
}

function buildDocumentTab(project, view) {
  return {
    id: documentTabId(project.id, view),
    projectId: project.id,
    view,
    label: view ? `${project.name} · ${DOC_LABELS[view] ?? view}` : project.name,
  };
}

function IconPanelToggle() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9 4v16" />
      <rect x="3" y="4" width="6" height="16" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function DocumentTabBar({ tabs, activeTabId, onActivate, onClose, onToggleSidebar }) {
  if (!tabs.length) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", height: 36,
      background: "var(--bg)", borderBottom: "1px solid var(--border)",
      overflowX: "auto", flexShrink: 0,
    }}>
      <button
        type="button"
        onClick={onToggleSidebar}
        title="사이드바 접기/펼치기"
        style={{
          width: 26, height: 26, borderRadius: 7, flexShrink: 0, margin: "0 4px 0 8px",
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-3)",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
        onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
      >
        <IconPanelToggle />
      </button>
      {tabs.map((tab) => {
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onActivate(tab)}
            title={tab.label}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "0 8px 0 14px", height: "100%", flexShrink: 0,
              borderRight: "1px solid var(--border)",
              borderBottom: active ? "2px solid var(--db-purple-400)" : "2px solid transparent",
              background: active ? "var(--db-bg-primary)" : "transparent",
              color: active ? "var(--text-1)" : "var(--text-3)",
              fontSize: 12, fontWeight: active ? 700 : 500,
              cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
            }}
          >
            <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis" }}>{tab.label}</span>
            <button
              type="button"
              onClick={(e) => onClose(tab.id, e)}
              title="탭 닫기"
              style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: "none", background: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "inherit", fontSize: 11, opacity: 0.6, fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = "rgba(0,0,0,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = "none"; }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

function buildRunningProject(runningPipeline) {
  if (!runningPipeline) return null;

  return {
    id: String(runningPipeline.projectId),
    teamId: runningPipeline.teamId,
    name: runningPipeline.projectName,
    description: "",
    status: "running",
    prdDocument: null,
    dbSchema: null,
    apiSpec: null,
    featureList: [],
    marketResearch: null,
    score: 0,
    consistencyScore: 0,
    progress: 0,
    tags: [],
    members: [],
    lastActivity: "",
    created: "",
    prdCount: 0,
    issueCount: 0,
    specCount: 0,
    color: "var(--text-1)",
  };
}

function mergeWorkspaceProjects(projects, runningPipeline) {
  if (!runningPipeline) return projects;

  const runningProjectId = String(runningPipeline.projectId);
  const exists = projects.some((project) => String(project.id) === runningProjectId);
  if (exists) {
    return projects.map((project) => (
      String(project.id) === runningProjectId
        ? { ...project, status: "running", teamId: runningPipeline.teamId }
        : project
    ));
  }

  return [buildRunningProject(runningPipeline), ...projects];
}

function DashboardEmptyState({ workspaceName, hasWorkspace, onCreateProject, onOpenWorkspaceComposer }) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 40,
      background: "linear-gradient(180deg, rgba(26,25,22,0.03) 0%, var(--surface) 100%)",
    }}>
      <div style={{
        width: "min(520px, 100%)",
        padding: "34px 32px",
        borderRadius: 24,
        border: "1px solid rgba(0,0,0,0.06)",
        background: "var(--surface)",
        boxShadow: "0 22px 60px rgba(0,0,0,0.14)",
        textAlign: "center",
      }}>
        <div style={{
          width: 56,
          height: 56,
          margin: "0 auto 16px",
          borderRadius: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(26,25,22,0.08)",
          fontSize: 28,
        }}>
          {hasWorkspace ? "📁" : "👥"}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text-1)", letterSpacing: "-.03em" }}>
          {hasWorkspace
            ? `${workspaceName ?? "이 워크스페이스"}에는 아직 프로젝트가 없어요`
            : "먼저 워크스페이스를 만들어 주세요"}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 10, lineHeight: 1.8 }}>
          {hasWorkspace
            ? "이 워크스페이스에서 여러 프로젝트를 함께 관리하고, 같은 초대 코드로 팀원을 초대할 수 있어요."
            : "새 워크스페이스를 만들거나 초대 코드로 참여해 보세요."}
        </div>
        {hasWorkspace ? (
          <button
            type="button"
            onClick={onCreateProject}
            style={{
              marginTop: 18,
              padding: "11px 18px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "var(--surface)",
              color: "var(--text-2)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            첫 프로젝트 만들기
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenWorkspaceComposer}
            style={{
              marginTop: 18,
              padding: "11px 18px",
              borderRadius: 14,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "var(--surface)",
              color: "var(--text-2)",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            워크스페이스 시작하기
          </button>
        )}
      </div>
    </div>
  );
}


const DOCUMENT_FIELDS = {
  PRD: "prdDocument",
  FEATURE_LIST: "featureList",
  API_SPEC: "apiSpec",
  DB_SCHEMA: "dbSchema",
};

function projectDocuments(project) {
  return Object.fromEntries(
    Object.entries(DOCUMENT_FIELDS)
      .filter(([type, field]) => project?.artifactIds?.[type] && project?.[field] != null)
      .map(([type, field]) => [type, project[field]])
  );
}

function replaceProjectDocument(project, type, document) {
  const field = DOCUMENT_FIELDS[type];
  return field && project ? { ...project, [field]: document } : project;
}

function DocumentSyncStatus({ sync }) {
  if (!sync) return null;
  const isRunning = sync.phase === "analyzing" || sync.phase === "applying";
  const isError = sync.phase === "error";
  const accent = isError ? "#dc2626" : sync.phase === "complete" ? "#059669" : "#2563eb";

  return (
    <div style={{
      position: "fixed", right: 18, bottom: 18, zIndex: 270, width: 340,
      padding: "14px 15px", borderRadius: 14, background: "var(--surface)",
      border: `1px solid ${isError ? "rgba(239,68,68,0.22)" : "rgba(37,99,235,0.16)"}`,
      boxShadow: "0 18px 48px rgba(0,0,0,0.18)", fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{
          width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: `${accent}14`, color: accent, fontSize: 11, fontWeight: 900,
          animation: isRunning ? "document-sync-spin 0.9s linear infinite" : "none",
        }}>{isRunning ? "↻" : isError ? "!" : "✓"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-1)" }}>{sync.title}</div>
          <div style={{ marginTop: 2, fontSize: 11, color: "var(--text-3)", lineHeight: 1.45 }}>{sync.message}</div>
        </div>
      </div>

      {sync.targets?.length > 0 && (
        <div style={{ display: "grid", gap: 6, marginTop: 11 }}>
          {sync.targets.map(target => {
            const color = target.status === "failed" ? "#dc2626" : target.status === "completed" ? "#059669" : "#2563eb";
            const statusLabel = target.status === "failed" ? "실패" : target.status === "completed" ? "반영 완료" : "수정 중";
            return (
              <div key={target.type} style={{ padding: "8px 9px", borderRadius: 8, background: "var(--bg)", border: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>{documentLabel(target.type)}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color }}>{statusLabel}</span>
                </div>
                {target.reason && <div style={{ marginTop: 3, fontSize: 10, color: "var(--text-3)", lineHeight: 1.4 }}>{target.reason}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [activeMode, setActiveMode] = useState("projects");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedView, setSelectedView] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(null); // { pipelineId, projectId, projectName, teamId }
  const [contextPanelCollapsed, setContextPanelCollapsed] = useState(false);
  const [openTabs, setOpenTabs] = useState([]); // 동시에 열린 문서 탭들 [{ id, projectId, view, label }]
  const [activeTabId, setActiveTabId] = useState(null);

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(() => getActiveTeamId());
  const [workspaceDetail, setWorkspaceDetail] = useState(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [isLoadingWorkspaceDetail, setIsLoadingWorkspaceDetail] = useState(false);
  const [workspaceManagementFocus, setWorkspaceManagementFocus] = useState("overview");

  const [composerOpen, setComposerOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [composerError, setComposerError] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [joiningWorkspace, setJoiningWorkspace] = useState(false);
  const [documentSync, setDocumentSync] = useState(null);
  const [editingDocumentType, setEditingDocumentType] = useState(null);
  const [myProjectRole, setMyProjectRole] = useState(null);
  const selectedProjectIdRef = useRef(null);
  const runningPipelineRef = useRef(null);
  const documentSyncRequestRef = useRef(0);
  const documentSyncAbortRef = useRef(null);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => getWorkspaceId(workspace) === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );

  const isRunningActiveWorkspace = runningPipeline && runningPipeline.teamId === activeWorkspaceId;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/");
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    selectedProjectIdRef.current = selectedProject?.id ?? null;
  }, [selectedProject?.id]);

  useEffect(() => {
    documentSyncAbortRef.current?.abort();
    documentSyncAbortRef.current = null;
    setDocumentSync(null);
    setEditingDocumentType(null);
  }, [selectedProject?.id]);

  useEffect(() => {
    setEditingDocumentType(null);
  }, [selectedView]);

  useEffect(() => () => documentSyncAbortRef.current?.abort(), []);

  useEffect(() => {
    if (!selectedProject?.id || !user?.id) { setMyProjectRole(null); return; }
    fetchProjectMembers(selectedProject.id)
      .then(members => {
        const me = members.find(m => String(m.memberId) === String(user.id));
        setMyProjectRole(me?.projectRole ?? null);
      })
      .catch(() => setMyProjectRole(null));
  }, [selectedProject?.id, user?.id]);

  useEffect(() => {
    runningPipelineRef.current = runningPipeline;
  }, [runningPipeline]);

  useEffect(() => {
    if (!documentSync || !["complete", "error"].includes(documentSync.phase)) return undefined;
    const timeoutId = window.setTimeout(() => setDocumentSync(null), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [documentSync]);

  function handleModeChange(nextMode) {
    setActiveMode(nextMode);
    if (nextMode === "workspace") {
      setWorkspaceManagementFocus((current) => current || "overview");
    }
  }

  function openWorkspaceManager(section = "overview") {
    setWorkspaceManagementFocus(section);
    setActiveMode("workspace");
  }

  function applyActiveWorkspaceId(teamId) {
    persistActiveTeamId(teamId);
    setActiveWorkspaceIdState(teamId ?? null);
  }

  const loadArtifacts = useCallback(async (project) => {
    if (!project?.id) return;

    try {
      const artifacts = await fetchProjectArtifacts(project.id);
      if (artifacts.length > 0) {
        setSelectedProject((current) => {
          if (!current || current.id !== project.id) return current;
          return enrichProjectWithArtifacts(current, artifacts);
        });
        setProjects((prev) => prev.map((p) =>
          p.id === project.id ? enrichProjectWithArtifacts(p, artifacts) : p
        ));
      }
    } catch (error) {
      console.error("Artifacts 로드 실패:", error);
    }
  }, []);

  const loadProjects = useCallback(async (teamId) => {
    if (teamId == null) {
      setProjects([]);
      setSelectedProject(null);
      setSelectedView(null);
      setShowWizard(false);
      setOpenTabs([]);
      setActiveTabId(null);
      setIsLoadingProjects(false);
      return;
    }

    setIsLoadingProjects(true);
    try {
      const baseList = await fetchProjectsByTeam(teamId);
      const currentRunningPipeline = runningPipelineRef.current;
      const mergedList = mergeWorkspaceProjects(
        baseList,
        currentRunningPipeline?.teamId === teamId ? currentRunningPipeline : null
      );

      const runningProjectId = currentRunningPipeline?.teamId === teamId
        ? String(currentRunningPipeline.projectId)
        : null;

      const nextSelected = (
        mergedList.find((project) => String(project.id) === String(selectedProjectIdRef.current))
        ?? (runningProjectId ? mergedList.find((project) => String(project.id) === runningProjectId) : null)
        ?? mergedList[0]
        ?? null
      );

      setProjects(mergedList);
      setSelectedProject(nextSelected);

      if (!nextSelected) {
        setSelectedView(null);
        setShowWizard(true);
        setOpenTabs([]);
        setActiveTabId(null);
      } else {
        const resolvedView = runningProjectId && nextSelected.id === runningProjectId ? null : "prd";
        setSelectedView((current) => current ?? resolvedView);
        setOpenTabs([buildDocumentTab(nextSelected, resolvedView)]);
        setActiveTabId(documentTabId(nextSelected.id, resolvedView));
      }

      if (nextSelected && (!runningProjectId || String(nextSelected.id) !== runningProjectId)) {
        loadArtifacts(nextSelected);
      }
    } catch (error) {
      console.error("프로젝트 목록 로드 실패:", error);
      setProjects([]);
      setSelectedProject(null);
      setSelectedView(null);
      setShowWizard(true);
      setOpenTabs([]);
      setActiveTabId(null);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [loadArtifacts]);

  const loadWorkspaces = useCallback(async (requestedWorkspaceId) => {
    setIsLoadingWorkspaces(true);

    try {
      const list = await getMyTeams();
      const safeList = Array.isArray(list) ? list : [];
      setWorkspaces(safeList);

      if (safeList.length === 0) {
        applyActiveWorkspaceId(null);
        setWorkspaceDetail(null);
        return safeList;
      }

      const currentId = requestedWorkspaceId ?? activeWorkspaceId;
      const currentExists = currentId != null && safeList.some((workspace) => getWorkspaceId(workspace) === currentId);
      const resolvedWorkspace = currentExists
        ? safeList.find((workspace) => getWorkspaceId(workspace) === currentId)
        : getPreferredTeam(safeList);
      const resolvedId = getWorkspaceId(resolvedWorkspace);

      if (resolvedId !== activeWorkspaceId) {
        applyActiveWorkspaceId(resolvedId);
      } else {
        setActiveWorkspaceIdState(resolvedId);
      }

      return safeList;
    } catch (error) {
      console.error("워크스페이스 목록 로드 실패:", error);
      setWorkspaces([]);
      applyActiveWorkspaceId(null);
      setWorkspaceDetail(null);
      return [];
    } finally {
      setIsLoadingWorkspaces(false);
    }
  }, [activeWorkspaceId]);

  const loadWorkspaceDetail = useCallback(async (workspaceId) => {
    if (workspaceId == null) {
      setWorkspaceDetail(null);
      setIsLoadingWorkspaceDetail(false);
      return;
    }

    setIsLoadingWorkspaceDetail(true);
    try {
      const detail = await getTeamWorkspace(workspaceId);
      setWorkspaceDetail(detail);
    } catch (error) {
      console.error("워크스페이스 상세 로드 실패:", error);
      setWorkspaceDetail(null);
    } finally {
      setIsLoadingWorkspaceDetail(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setWorkspaces([]);
      setWorkspaceDetail(null);
      setIsLoadingWorkspaces(false);
      applyActiveWorkspaceId(null);
      return;
    }
    loadWorkspaces(activeWorkspaceId);
  }, [authLoading, user, loadWorkspaces, activeWorkspaceId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProjects([]);
      setSelectedProject(null);
      setSelectedView(null);
      setShowWizard(false);
      setIsLoadingProjects(false);
      setIsLoadingWorkspaceDetail(false);
      return;
    }
    loadWorkspaceDetail(activeWorkspaceId);
    loadProjects(activeWorkspaceId);
  }, [authLoading, user, activeWorkspaceId, loadProjects, loadWorkspaceDetail]);

  if (authLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        minHeight: "100vh",
        background: "var(--surface)",
        color: "var(--text-3)",
        fontSize: 13,
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      }}>
        로그인 상태를 확인하는 중...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  /* 프로젝트 삭제는 워크스페이스 OWNER만 가능하다 (서버: ProjectService.delete → requireOwner).
     WorkspaceManagementView와 같은 기준으로 판정해 두 화면이 어긋나지 않게 한다. */
  const viewerRole = workspaceDetail?.viewerRole ?? workspaceDetail?.team?.viewerRole ?? "";
  const isWorkspaceOwner = viewerRole === "OWNER";

  async function handleDeleteProject(project) {
    if (!window.confirm(`"${project.name}" 프로젝트를 삭제할까요?`)) return;

    try {
      await deleteProject(project.id);

      const remainingProjects = projects.filter((current) => current.id !== project.id);
      setProjects(remainingProjects);
      setOpenTabs((prev) => prev.filter((t) => t.projectId !== project.id));

      if (selectedProject?.id === project.id) {
        const nextSelected = remainingProjects[0] ?? null;
        setSelectedProject(nextSelected);
        setSelectedView(nextSelected ? "prd" : null);
        setShowWizard(remainingProjects.length === 0);
        if (nextSelected) {
          loadArtifacts(nextSelected);
          openTab(buildDocumentTab(nextSelected, "prd"));
        } else {
          setActiveTabId(null);
        }
      }

      showToast("success", "프로젝트를 삭제했어요.");
    } catch (error) {
      console.error("프로젝트 삭제 실패:", error);
      showToast("error", "프로젝트 삭제에 실패했습니다.");
    }
  }

  /* ── 문서 탭 관리 ── */
  function openTab(tab) {
    setOpenTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === tab.id);
      if (idx === -1) return [...prev, tab];
      const next = [...prev];
      next[idx] = { ...next[idx], ...tab };
      return next;
    });
    setActiveTabId(tab.id);
  }

  function activateTab(tab) {
    setActiveTabId(tab.id);
    setActiveMode("projects");
    setShowWizard(false);
    const project = projects.find((p) => String(p.id) === String(tab.projectId)) ?? null;
    setSelectedProject(project);
    setSelectedView(tab.view ?? null);
  }

  function closeTab(tabId, event) {
    event?.stopPropagation();
    const idx = openTabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    const next = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(next);

    if (activeTabId !== tabId) return;

    const fallback = next[idx - 1] ?? next[idx] ?? null;
    if (fallback) {
      activateTab(fallback);
    } else {
      setActiveTabId(null);
      setShowWizard(false);
      setSelectedProject(null);
      setSelectedView(null);
    }
  }

  function handleSelectProject(project) {
    const view = isRunningActiveWorkspace && String(project.id) === String(runningPipeline?.projectId) ? null : "prd";
    setSelectedProject(project);
    setSelectedView(view);
    setShowWizard(false);
    openTab(buildDocumentTab(project, view));
    const alreadyLoaded = !!project.artifactIds;
    if (!alreadyLoaded && (!isRunningActiveWorkspace || String(project.id) !== String(runningPipeline?.projectId))) {
      loadArtifacts(project);
    }
  }

  function handleOpenDocument(project, view) {
    setSelectedProject(project);
    setSelectedView(view);
    setShowWizard(false);
    openTab(buildDocumentTab(project, view));
    if (!project.artifactIds) {
      loadArtifacts(project);
    }
  }

  /* AI 어시스턴트가 PRD 섹션을 수정하면 저장은 PrdPanel이 이미 마쳤다.
     여기서는 화면 상태만 새 문서로 맞춘다 — 선택된 프로젝트와 목록 양쪽 모두. */
  function handlePrdDocumentChange(nextDoc) {
    const projectId = selectedProject?.id;
    if (!projectId) return;
    setSelectedProject((current) =>
      current && current.id === projectId ? { ...current, prdDocument: nextDoc } : current
    );
    setProjects((prev) => prev.map((p) =>
      p.id === projectId ? { ...p, prdDocument: nextDoc } : p
    ));
  }

  function handleDocumentEditingChange(type, isEditing) {
    setEditingDocumentType(current => isEditing ? type : current === type ? null : current);
  }

  async function handleDocumentSaved({ sourceType, document }) {
    const projectSnapshot = selectedProject;
    const sourceField = DOCUMENT_FIELDS[sourceType];
    if (!projectSnapshot?.id || !sourceField || document == null) return;
    setEditingDocumentType(current => current === sourceType ? null : current);

    const before = projectSnapshot[sourceField] ?? null;
    const projectWithSource = replaceProjectDocument(projectSnapshot, sourceType, document);
    setSelectedProject(current =>
      current?.id === projectSnapshot.id ? replaceProjectDocument(current, sourceType, document) : current
    );
    setProjects(current => current.map(project =>
      project.id === projectSnapshot.id ? replaceProjectDocument(project, sourceType, document) : project
    ));

    if (JSON.stringify(before) === JSON.stringify(document)) return;

    const requestId = documentSyncRequestRef.current + 1;
    documentSyncRequestRef.current = requestId;
    documentSyncAbortRef.current?.abort();
    const controller = new AbortController();
    documentSyncAbortRef.current = controller;

    setDocumentSync({
      phase: "analyzing",
      sourceType,
      title: `${documentLabel(sourceType)} 변경 영향 분석`,
      message: "AI가 연결된 문서에서 함께 바뀌어야 할 항목을 확인하고 있습니다.",
      targets: [],
    });

    try {
      const analysis = await analyzeDocumentImpact({
        sourceType,
        before,
        after: document,
        documents: projectDocuments(projectWithSource),
        signal: controller.signal,
      });
      if (documentSyncRequestRef.current !== requestId) return;

      const updates = Array.from(new Map(
        analysis.updates
          .filter(update => projectSnapshot.artifactIds?.[update.type])
          .map(update => [update.type, update])
      ).values());
      if (updates.length === 0) {
        setDocumentSync({
          phase: "complete",
          sourceType,
          title: "영향도 분석 완료",
          message: analysis.summary || "추가로 수정할 연결 문서가 없습니다.",
          targets: [],
        });
        return;
      }

      setDocumentSync({
        phase: "applying",
        sourceType,
        title: `${documentLabel(sourceType)} 변경사항 반영`,
        message: analysis.summary || "AI가 선택한 연결 문서에 변경사항을 반영하고 있습니다.",
        targets: updates.map(update => ({ type: update.type, reason: update.reason, status: "pending" })),
      });

      let failedCount = 0;
      for (const update of updates) {
        if (documentSyncRequestRef.current !== requestId) return;
        setDocumentSync(current => current ? {
          ...current,
          targets: current.targets.map(target =>
            target.type === update.type ? { ...target, status: "applying" } : target
          ),
        } : current);

        try {
          await updateArtifact(projectSnapshot.artifactIds[update.type], JSON.stringify(update.document));
          setSelectedProject(current =>
            current?.id === projectSnapshot.id ? replaceProjectDocument(current, update.type, update.document) : current
          );
          setProjects(current => current.map(project =>
            project.id === projectSnapshot.id ? replaceProjectDocument(project, update.type, update.document) : project
          ));
          setDocumentSync(current => current ? {
            ...current,
            targets: current.targets.map(target =>
              target.type === update.type ? { ...target, status: "completed" } : target
            ),
          } : current);
        } catch (error) {
          failedCount += 1;
          setDocumentSync(current => current ? {
            ...current,
            targets: current.targets.map(target =>
              target.type === update.type ? { ...target, status: "failed", reason: error.message || "문서 저장에 실패했습니다." } : target
            ),
          } : current);
        }
      }

      setDocumentSync(current => current ? {
        ...current,
        phase: failedCount > 0 ? "error" : "complete",
        title: failedCount > 0 ? "일부 문서 반영 실패" : "연결 문서 반영 완료",
        message: failedCount > 0
          ? `${updates.length - failedCount}개 문서는 반영됐고 ${failedCount}개 문서는 저장하지 못했습니다.`
          : `${updates.length}개 연결 문서가 최신 변경사항에 맞게 수정됐습니다.`,
      } : current);
    } catch (error) {
      if (error.name === "AbortError" || documentSyncRequestRef.current !== requestId) return;
      setDocumentSync({
        phase: "error",
        sourceType,
        title: "연결 문서 분석 실패",
        message: error.message || "AI 영향도 분석을 완료하지 못했습니다.",
        targets: [],
      });
    }
  }

  function handleOpenCreateProject() {
    if (!activeWorkspaceId) {
      setComposerError("");
      setComposerOpen(true);
      return;
    }
    setShowWizard(true);
    setSelectedView(null);
  }

  function handleSelectWorkspace(nextWorkspaceId) {
    if (!nextWorkspaceId || nextWorkspaceId === activeWorkspaceId) return;

    if (runningPipeline && runningPipeline.teamId === activeWorkspaceId) {
      const proceed = window.confirm("이 워크스페이스에서 파이프라인이 실행 중입니다. 다른 워크스페이스로 이동해도 실행은 계속됩니다. 이동할까요?");
      if (!proceed) return;
    }

    applyActiveWorkspaceId(nextWorkspaceId);
    setActiveMode("projects");
    setShowWizard(false);
    setSelectedView(null);
    setOpenTabs([]);
    setActiveTabId(null);
  }

  function handlePipelineStart(pipelineId, projectId, projectName) {
    const nextRunningPipeline = {
      pipelineId,
      projectId,
      projectName,
      teamId: activeWorkspaceId,
    };

    const runningProject = buildRunningProject(nextRunningPipeline);
    setRunningPipeline(nextRunningPipeline);

    setProjects((currentProjects) => {
      const exists = currentProjects.some((project) => String(project.id) === String(projectId));
      if (exists) {
        return currentProjects.map((project) => (
          String(project.id) === String(projectId)
            ? { ...project, status: "running", teamId: activeWorkspaceId }
            : project
        ));
      }
      return [runningProject, ...currentProjects];
    });

    setSelectedProject(runningProject);
    setSelectedView(null);
    setShowWizard(false);
  }

  // 빈 객체 {} 는 생성 실패로 간주, null로 처리
  const nonEmpty = (v) =>
    v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0 ? v : null;

  async function handlePipelineComplete(pipelineResult) {
    const pipelineWorkspaceId = runningPipeline?.teamId ?? activeWorkspaceId;
    const completedProject = {
      id: String(pipelineResult?.projectId ?? Date.now()),
      teamId: pipelineWorkspaceId,
      name: pipelineResult?.projectName ?? "새 프로젝트",
      description: "",
      status: "active",
      prdDocument: nonEmpty(pipelineResult?.prdDocument),
      dbSchema: nonEmpty(pipelineResult?.dbSchema),
      apiSpec: nonEmpty(pipelineResult?.apiSpec),
      featureList: pipelineResult?.featureList ?? [],
      marketResearch: pipelineResult?.marketResearch ?? null,
      score: 0,
      consistencyScore: 0,
      progress: 0,
      tags: [],
      members: [],
      lastActivity: "",
      created: "",
      prdCount: 0,
      issueCount: 0,
      specCount: 0,
      color: "var(--text-1)",
    };

    setRunningPipeline(null);

    if (pipelineWorkspaceId !== activeWorkspaceId) {
      return;
    }

    setSelectedProject(completedProject);
    setSelectedView("prd");
    setShowWizard(false);
    setOpenTabs((prev) => prev.filter((t) => t.projectId !== completedProject.id));
    openTab(buildDocumentTab(completedProject, "prd"));
    setProjects((currentProjects) => {
      const exists = currentProjects.some((project) => String(project.id) === completedProject.id);
      if (exists) {
        return currentProjects.map((project) => (
          String(project.id) === completedProject.id
            ? { ...project, ...completedProject }
            : project
        ));
      }
      return [completedProject, ...currentProjects];
    });

    loadArtifacts(completedProject);
    showToast("success", "프로젝트 초안 생성이 완료됐어요.");
  }

  async function handleCreateWorkspace() {
    const name = createName.trim();
    if (!name) {
      setComposerError("워크스페이스 이름을 입력해 주세요.");
      return;
    }

    setCreatingWorkspace(true);
    setComposerError("");
    try {
      const created = await createTeam(name, createDescription.trim());
      const nextWorkspaceId = getWorkspaceId(created);
      applyActiveWorkspaceId(nextWorkspaceId);
      await loadWorkspaces(nextWorkspaceId);
      setComposerOpen(false);
      setCreateName("");
      setCreateDescription("");
      showToast("success", "새 워크스페이스를 만들었어요.");
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : "워크스페이스 생성에 실패했습니다.");
    } finally {
      setCreatingWorkspace(false);
    }
  }

  async function handleJoinWorkspace() {
    const normalizedCode = joinCode.trim().toUpperCase();
    if (!normalizedCode) {
      setComposerError("초대 코드를 입력해 주세요.");
      return;
    }

    setJoiningWorkspace(true);
    setComposerError("");
    try {
      const joined = await joinTeamByInviteCode(normalizedCode);
      const nextWorkspaceId = joined?.teamId ?? null;
      applyActiveWorkspaceId(nextWorkspaceId);
      await loadWorkspaces(nextWorkspaceId);
      setComposerOpen(false);
      setJoinCode("");
      showToast("success", "워크스페이스에 참여했어요.");
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : "워크스페이스 참여에 실패했습니다.");
    } finally {
      setJoiningWorkspace(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes dash-panel-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        @keyframes document-sync-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--surface)",
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      }}>
        <ActivityBar
          activeMode={activeMode}
          onModeChange={handleModeChange}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          workspacesLoading={isLoadingWorkspaces}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWorkspace={() => {
            setComposerError("");
            setComposerOpen(true);
          }}
        />
        <ContextPanel
          mode={activeMode}
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          selectedView={selectedView}
          onSelectView={setSelectedView}
          onOpenDocument={handleOpenDocument}
          onCreateProject={handleOpenCreateProject}
          onOpenWorkspaceComposer={() => {
            setComposerError("");
            setComposerOpen(true);
          }}
          onOpenWorkspaceManage={() => openWorkspaceManager("overview")}
          onOpenWorkspaceMembers={() => openWorkspaceManager("members")}
          onDeleteProject={isWorkspaceOwner ? handleDeleteProject : undefined}
          workspace={workspaceDetail?.team ?? activeWorkspace}
          workspaceMembers={workspaceDetail?.members ?? []}
          workspaceLoading={isLoadingWorkspaceDetail}
          onOpenWorkspaceInvite={() => openWorkspaceManager("invite")}
          documentSync={documentSync}
          editingDocumentType={editingDocumentType}
          collapsed={contextPanelCollapsed}
        />

        {activeMode === "workspace" ? (
          <WorkspaceManagementView
            activeWorkspaceId={activeWorkspaceId}
            workspaceDetail={workspaceDetail}
            workspaceLoading={isLoadingWorkspaceDetail}
            currentUserId={user?.id ?? null}
            onOpenComposer={() => {
              setComposerError("");
              setComposerOpen(true);
            }}
            focusedSection={workspaceManagementFocus}
            onReloadWorkspace={loadWorkspaceDetail}
            onReloadWorkspaces={loadWorkspaces}
            onBack={() => setActiveMode("projects")}
            onToggleSidebar={() => setContextPanelCollapsed((v) => !v)}
          />
        ) : showWizard ? (
          activeWorkspaceId ? (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <ProjectChatWizard
                key={`wizard-${activeWorkspaceId}`}
                onPipelineStart={handlePipelineStart}
                onCancel={() => setShowWizard(false)}
                sidebarCollapsed={contextPanelCollapsed}
                onToggleSidebar={() => setContextPanelCollapsed(v => !v)}
              />
            </div>
          ) : (
            <DashboardEmptyState
              workspaceName={null}
              hasWorkspace={false}
              onCreateProject={handleOpenCreateProject}
              onOpenWorkspaceComposer={() => {
                setComposerError("");
                setComposerOpen(true);
              }}
            />
          )
        ) : isRunningActiveWorkspace && selectedProject?.id === String(runningPipeline?.projectId) ? (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <ProgressScreen
              pipelineId={runningPipeline.pipelineId}
              onComplete={(result) => handlePipelineComplete({
                ...result,
                projectId: runningPipeline.projectId,
                projectName: runningPipeline.projectName,
              })}
              onCancel={() => {
                setRunningPipeline(null);
                setProjects((currentProjects) => currentProjects.filter((project) => String(project.id) !== String(runningPipeline.projectId)));
                setSelectedProject(null);
                setShowWizard(true);
              }}
              onToggleSidebar={() => setContextPanelCollapsed((v) => !v)}
            />
          </div>
        ) : selectedProject ? (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <DocumentTabBar
              tabs={openTabs}
              activeTabId={activeTabId}
              onActivate={activateTab}
              onClose={closeTab}
              onToggleSidebar={() => setContextPanelCollapsed((v) => !v)}
            />
            <div key={selectedProject.id} style={{ flex: 1, overflow: "hidden", display: "flex", animation: "dash-panel-in 0.18s ease" }}>
              {selectedView === "prd" ? (
                <PrdPanel
                  project={selectedProject}
                  readOnly={!canEditDocType(myProjectRole, "PRD")}
                  onDocumentChange={handlePrdDocumentChange}
                  onDocumentSaved={handleDocumentSaved}
                  onDocumentEditingChange={handleDocumentEditingChange}
                />
              ) : selectedView === "features" ? (
                <FeaturesPanel project={selectedProject} readOnly={!canEditDocType(myProjectRole, "FEATURE_LIST")} onDocumentSaved={handleDocumentSaved} onDocumentEditingChange={handleDocumentEditingChange} />
              ) : selectedView === "api" ? (
                <ApiSpecPanel project={selectedProject} readOnly={!canEditDocType(myProjectRole, "API_SPEC")} onDocumentSaved={handleDocumentSaved} onDocumentEditingChange={handleDocumentEditingChange} />
              ) : selectedView === "erd" ? (
                <ErdPanel project={selectedProject} readOnly={!canEditDocType(myProjectRole, "DB_SCHEMA")} onDocumentSaved={handleDocumentSaved} onDocumentEditingChange={handleDocumentEditingChange} />
              ) : selectedView === "graph" ? (
                <ProjectKnowledgeGraph project={selectedProject} />
              ) : selectedView === "qa" ? (
                <QaTestPanel project={selectedProject} />
              ) : selectedView === "github" ? (
                <GithubWorkspacePanel project={selectedProject} onSelectView={setSelectedView} />
              ) : selectedView === "issues" ? (
                <GithubIssuesPanel project={selectedProject} canManage={myProjectRole === "PM"} />
              ) : selectedView === "pulls" ? (
                <GithubPullRequestsPanel project={selectedProject} canManage={myProjectRole === "PM"} />
              ) : (
                <AgentPanel project={selectedProject} view={selectedView} />
              )}
            </div>
          </div>
        ) : isLoadingProjects ? (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-3)",
            fontSize: 13,
          }}>
            프로젝트를 불러오는 중...
          </div>
        ) : projects.length > 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)", fontSize: 13 }}>
            사이드바에서 프로젝트를 선택해 주세요.
          </div>
        ) : (
          <DashboardEmptyState
            workspaceName={activeWorkspace?.teamName ?? activeWorkspace?.name ?? null}
            hasWorkspace={Boolean(activeWorkspaceId)}
            onCreateProject={handleOpenCreateProject}
            onOpenWorkspaceComposer={() => {
              setComposerError("");
              setComposerOpen(true);
            }}
          />
        )}
      </div>

      <WorkspaceComposerDialog
        open={composerOpen}
        createName={createName}
        createDescription={createDescription}
        joinCode={joinCode}
        creating={creatingWorkspace}
        joining={joiningWorkspace}
        error={composerError}
        onClose={() => {
          setComposerOpen(false);
          setComposerError("");
        }}
        onCreateNameChange={setCreateName}
        onCreateDescriptionChange={setCreateDescription}
        onJoinCodeChange={setJoinCode}
        onCreate={handleCreateWorkspace}
        onJoin={handleJoinWorkspace}
      />

      <DocumentSyncStatus sync={documentSync} />
    </>
  );
}
