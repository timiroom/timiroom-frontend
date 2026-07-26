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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActivityBar } from "@/components/dashboard/ActivityBar";
import { ContextPanel } from "@/components/dashboard/ContextPanel";
import { AgentPanel } from "@/components/dashboard/AgentPanel";
import { ApiSpecPanel } from "@/components/dashboard/ApiSpecPanel";
import { PrdPanel } from "@/components/dashboard/PrdPanel";
import { FeaturesPanel } from "@/components/dashboard/FeaturesPanel";
import { ErdPanel } from "@/components/dashboard/ErdPanel";
import KnowledgeGraph from "@/components/KnowledgeGraph";
import BranchVisualization from "@/components/BranchVisualization";
import { ProjectChatWizard, ProgressScreen } from "@/components/dashboard/ProjectChatWizard";
import { WorkspaceComposerDialog } from "@/components/dashboard/workspace/WorkspaceComposerDialog";
import { WorkspaceManagementView } from "@/components/dashboard/workspace/WorkspaceManagementView";
import { useAuth } from "@/context/AuthContext";
import {
  deleteProject,
  enrichProjectWithArtifacts,
  fetchProjectArtifacts,
  fetchProjectMembers,
  fetchProjectsByTeam,
} from "@/lib/projectApi";

const ROLE_DOCUMENT_PERMISSIONS = {
  PM:       ["PRD", "DB_SCHEMA", "API_SPEC", "FEATURE_LIST", "MARKET_RESEARCH", "QA_REPORT"],
  BACKEND:  ["DB_SCHEMA", "API_SPEC"],
  FRONTEND: ["API_SPEC", "FEATURE_LIST"],
  DESIGNER: ["PRD", "MARKET_RESEARCH", "FEATURE_LIST"],
  INFRA:    ["DB_SCHEMA"],
};

const SCREEN_SPEC_STATE = {
  "DASH-001":  { mode: "projects", view: "prd", showWizard: false },
  "WORK-001":  { mode: "workspace", view: null, showWizard: false, focus: "overview" },
  "PROJ-001":  { mode: "projects", view: null, showWizard: true },
  "DOC-001":   { mode: "projects", view: "prd", showWizard: false },
  "DOC-002":   { mode: "projects", view: "features", showWizard: false },
  "DOC-003":   { mode: "projects", view: "api", showWizard: false },
  "DOC-004":   { mode: "projects", view: "erd", showWizard: false },
  "GRAPH-001": { mode: "projects", view: "graph", showWizard: false },
  "AGENT-001": { mode: "projects", view: "agent", showWizard: false },
  "HIST-001":  { mode: "commit", view: "prd", showWizard: false },
};

function normalizeScreenSpecId(screenSpec) {
  if (!screenSpec) return null;
  if (screenSpec.startsWith("DOC-001")) return "DOC-001";
  if (screenSpec.startsWith("DOC-002")) return "DOC-002";
  if (screenSpec.startsWith("DOC-003")) return "DOC-003";
  if (screenSpec.startsWith("DOC-004")) return "DOC-004";
  return screenSpec;
}

const SCREEN_SPEC_WORKSPACE_ID = "screen-spec-workspace";

const SCREEN_SPEC_WORKSPACE = {
  id: SCREEN_SPEC_WORKSPACE_ID,
  teamId: SCREEN_SPEC_WORKSPACE_ID,
  teamName: "문서정합성 TF",
  name: "문서정합성 TF",
  description: "문서 변경사항과 연결 산출물을 함께 관리하는 협업 공간",
  viewerRole: "OWNER",
};

const SCREEN_SPEC_PROJECT = {
  id: "screen-spec-project",
  teamId: SCREEN_SPEC_WORKSPACE_ID,
  name: "Align-it MVP",
  description: "PRD, 기능 명세, API 명세, ERD를 연결해 관리하는 프로젝트",
  status: "active",
  prdDocument: {
    title: "문서 협업 플랫폼 PRD",
    content: "문서 변경사항을 저장하고 관련 산출물에 반영 상태를 표시한다.",
  },
  dbSchema: {
    tables: [
      { name: "projects", columns: ["id", "team_id", "name", "created_at"] },
      { name: "documents", columns: ["id", "project_id", "type", "content"] },
      { name: "document_links", columns: ["source_document_id", "target_document_id"] },
    ],
  },
  apiSpec: {
    endpoints: [
      { method: "POST", path: "/api/documents/{id}/save", summary: "문서 저장" },
      { method: "GET", path: "/api/projects/{id}/artifacts", summary: "산출물 조회" },
    ],
  },
  featureList: [
    { title: "문서 수동 저장", description: "수정 감지 시 저장 버튼 활성화", priority: "P1" },
    { title: "연결 문서 반영", description: "저장 후 관련 문서 상태 갱신", priority: "P1" },
    { title: "키워드 시각화", description: "문서 간 연결 노드 표시", priority: "P2" },
  ],
  marketResearch: null,
  score: 86,
  consistencyScore: 86,
  progress: 72,
  tags: ["문서 관리", "협업", "정합성"],
  members: [],
  lastActivity: "방금 전",
  created: "2026.07.12",
  prdCount: 1,
  issueCount: 4,
  specCount: 4,
  color: "var(--text-1)",
};

const SCREEN_SPEC_WORKSPACE_DETAIL = {
  team: SCREEN_SPEC_WORKSPACE,
  members: [
    { memberId: "screen-spec-user", name: "최은솔", projectRole: "PM", teamRole: "OWNER" },
    { memberId: "screen-spec-backend", name: "정하윤", projectRole: "BACKEND", teamRole: "MEMBER" },
    { memberId: "screen-spec-design", name: "박도윤", projectRole: "DESIGNER", teamRole: "MEMBER" },
  ],
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

function DashboardToast({ notice }) {
  if (!notice) return null;

  return (
    <div style={{
      position: "fixed",
      top: 18,
      right: 18,
      zIndex: 260,
      minWidth: 220,
      padding: "12px 14px",
      borderRadius: 14,
      border: `1px solid ${notice.type === "error" ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.18)"}`,
      background: notice.type === "error" ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
      color: notice.type === "error" ? "#dc2626" : "#059669",
      fontSize: 12,
      fontWeight: 700,
      boxShadow: "0 14px 34px rgba(0,0,0,0.14)",
    }}>
      {notice.message}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathScreenSpec =
    pathname.match(/\/dashboard\/screen-spec\/([^/]+)/)?.[1]
    ?? pathname.match(/\/screen-spec-capture\/([^/]+)/)?.[1]
    ?? null;
  const screenSpec = normalizeScreenSpecId(searchParams.get("screenSpec") ?? pathScreenSpec);
  const { user, isLoading: authLoading } = useAuth();
  const [activeMode, setActiveMode] = useState("projects");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedView, setSelectedView] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(null); // { pipelineId, projectId, projectName, teamId }

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
  const [notice, setNotice] = useState(null);
  const [myProjectRole, setMyProjectRole] = useState(null);
  const selectedProjectIdRef = useRef(null);
  const runningPipelineRef = useRef(null);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => getWorkspaceId(workspace) === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  );
  const screenSpecState = screenSpec ? SCREEN_SPEC_STATE[screenSpec] : null;
  const isScreenSpecView = Boolean(screenSpecState);
  const effectiveActiveMode = screenSpecState?.mode ?? activeMode;
  const effectiveSelectedView = screenSpecState?.view ?? selectedView;
  const effectiveShowWizard = screenSpecState?.showWizard ?? showWizard;

  const isRunningActiveWorkspace = runningPipeline && runningPipeline.teamId === activeWorkspaceId;

  useEffect(() => {
    if (authLoading) return;
    if (isScreenSpecView) return;
    if (!user) {
      router.replace("/");
    }
  }, [authLoading, isScreenSpecView, router, user]);

  useEffect(() => {
    selectedProjectIdRef.current = selectedProject?.id ?? null;
  }, [selectedProject?.id]);

  useEffect(() => {
    if (isScreenSpecView) {
      setMyProjectRole("PM");
      return;
    }
    if (!selectedProject?.id || !user?.id) { setMyProjectRole(null); return; }
    fetchProjectMembers(selectedProject.id)
      .then(members => {
        const me = members.find(m => String(m.memberId) === String(user.id));
        setMyProjectRole(me?.projectRole ?? null);
      })
      .catch(() => setMyProjectRole(null));
  }, [isScreenSpecView, selectedProject?.id, user?.id]);

  useEffect(() => {
    runningPipelineRef.current = runningPipeline;
  }, [runningPipeline]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(null), 2400);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!screenSpec) return;
    const specState = SCREEN_SPEC_STATE[screenSpec];
    if (!specState) return;

    setWorkspaces([SCREEN_SPEC_WORKSPACE]);
    setWorkspaceDetail(SCREEN_SPEC_WORKSPACE_DETAIL);
    setActiveWorkspaceIdState(SCREEN_SPEC_WORKSPACE_ID);
    setProjects([SCREEN_SPEC_PROJECT]);
    setSelectedProject(SCREEN_SPEC_PROJECT);
    setIsLoadingWorkspaces(false);
    setIsLoadingWorkspaceDetail(false);
    setIsLoadingProjects(false);
    setActiveMode(specState.mode);
    setSelectedView(specState.view);
    setShowWizard(specState.showWizard);
    if (specState.focus) {
      setWorkspaceManagementFocus(specState.focus);
    }
  }, [screenSpec, selectedProject?.id]);

  function showNotice(type, message) {
    setNotice({ type, message });
  }

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
      } else {
        setSelectedView((current) => current ?? (runningProjectId && nextSelected.id === runningProjectId ? null : "prd"));
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
    if (isScreenSpecView) return;
    if (authLoading) return;
    if (!user) {
      setWorkspaces([]);
      setWorkspaceDetail(null);
      setIsLoadingWorkspaces(false);
      applyActiveWorkspaceId(null);
      return;
    }
    loadWorkspaces(activeWorkspaceId);
  }, [authLoading, isScreenSpecView, user, loadWorkspaces, activeWorkspaceId]);

  useEffect(() => {
    if (isScreenSpecView) return;
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
  }, [authLoading, isScreenSpecView, user, activeWorkspaceId, loadProjects, loadWorkspaceDetail]);

  if (authLoading && !isScreenSpecView) {
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

  if (!user && !isScreenSpecView) {
    return null;
  }

  async function handleDeleteProject(project) {
    if (!window.confirm(`"${project.name}" 프로젝트를 삭제할까요?`)) return;

    try {
      await deleteProject(project.id);

      const remainingProjects = projects.filter((current) => current.id !== project.id);
      setProjects(remainingProjects);

      if (selectedProject?.id === project.id) {
        const nextSelected = remainingProjects[0] ?? null;
        setSelectedProject(nextSelected);
        setSelectedView(nextSelected ? "prd" : null);
        setShowWizard(remainingProjects.length === 0);
        if (nextSelected) {
          loadArtifacts(nextSelected);
        }
      }

      showNotice("success", "프로젝트를 삭제했어요.");
    } catch (error) {
      console.error("프로젝트 삭제 실패:", error);
      showNotice("error", "프로젝트 삭제에 실패했습니다.");
    }
  }

  function handleSelectProject(project) {
    setSelectedProject(project);
    setSelectedView(isRunningActiveWorkspace && String(project.id) === String(runningPipeline?.projectId) ? null : "prd");
    setShowWizard(false);
    const alreadyLoaded = !!project.artifactIds;
    if (!alreadyLoaded && (!isRunningActiveWorkspace || String(project.id) !== String(runningPipeline?.projectId))) {
      loadArtifacts(project);
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
    showNotice("success", "프로젝트 초안 생성이 완료됐어요.");
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
      showNotice("success", "새 워크스페이스를 만들었어요.");
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
      showNotice("success", "워크스페이스에 참여했어요.");
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : "워크스페이스 참여에 실패했습니다.");
    } finally {
      setJoiningWorkspace(false);
    }
  }

  return (
    <>
      <style>{`@keyframes dash-panel-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }`}</style>
      <div style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--surface)",
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      }}>
        <ActivityBar
          activeMode={effectiveActiveMode}
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
          mode={effectiveActiveMode}
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          selectedView={effectiveSelectedView}
          onSelectView={setSelectedView}
          onCreateProject={handleOpenCreateProject}
          onOpenWorkspaceComposer={() => {
            setComposerError("");
            setComposerOpen(true);
          }}
          onOpenWorkspaceManage={() => openWorkspaceManager("overview")}
          onOpenWorkspaceMembers={() => openWorkspaceManager("members")}
          onDeleteProject={handleDeleteProject}
          workspace={workspaceDetail?.team ?? activeWorkspace}
          workspaceMembers={workspaceDetail?.members ?? []}
          workspaceLoading={isLoadingWorkspaceDetail}
          onOpenWorkspaceInvite={() => openWorkspaceManager("invite")}
        />

        {effectiveActiveMode === "workspace" ? (
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
          />
        ) : effectiveShowWizard ? (
          activeWorkspaceId ? (
            <div style={{ flex: 1, overflow: "hidden" }}>
              <ProjectChatWizard
                key={`wizard-${activeWorkspaceId}`}
                onPipelineStart={handlePipelineStart}
                onCancel={() => setShowWizard(false)}
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
            />
          </div>
        ) : selectedProject ? (
          <div key={selectedProject.id} style={{ flex: 1, overflow: "hidden", display: "flex", animation: "dash-panel-in 0.18s ease" }}>
            {effectiveSelectedView === "prd" ? (
              <PrdPanel project={selectedProject} readOnly={!canEditDocType(myProjectRole, "PRD")} />
            ) : effectiveSelectedView === "features" ? (
              <FeaturesPanel project={selectedProject} readOnly={!canEditDocType(myProjectRole, "FEATURE_LIST")} />
            ) : effectiveSelectedView === "api" ? (
              <ApiSpecPanel project={selectedProject} readOnly={!canEditDocType(myProjectRole, "API_SPEC")} />
            ) : effectiveSelectedView === "erd" ? (
              <ErdPanel project={selectedProject} readOnly={!canEditDocType(myProjectRole, "DB_SCHEMA")} />
            ) : effectiveSelectedView === "graph" ? (
              <div style={{ flex: 1, padding: '24px', overflow: 'hidden' }}>
                <KnowledgeGraph />
              </div>
            ) : effectiveSelectedView === "branch" ? (
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: '#fdfdfd' }}>
                <BranchVisualization />
              </div>
            ) : (
              <AgentPanel project={selectedProject} view={effectiveSelectedView} />
            )}
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

      <DashboardToast notice={notice} />
    </>
  );
}
