"use client";

/**
 * app/dashboard/page.jsx
 *
 * 레이아웃: [사이드바(ContextPanel) 320px] | [본문 flex-1]
 *
 * 워크스페이스 기준으로 프로젝트를 묶는다. 사이드바 맨 위에서 워크스페이스를 바꾸고,
 * 맨 아래 계정 줄에서 프로필·설정·로그아웃과 알림을 연다.
 */

import { confirmDialog, toast } from "@/lib/feedback";
import { tint } from "@/lib/color";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ContextPanel } from "@/components/dashboard/ContextPanel";
import { AgentPanel } from "@/components/dashboard/AgentPanel";
import { ApiSpecPanel } from "@/components/dashboard/ApiSpecPanel";
import { PrdPanel } from "@/components/dashboard/PrdPanel";
import { FeaturesPanel } from "@/components/dashboard/FeaturesPanel";
import { ErdPanel } from "@/components/dashboard/ErdPanel";
import { KnowledgeGraph } from "@/components/dashboard/KnowledgeGraph";
import { QaTestPanel } from "@/components/dashboard/QaTestPanel";
import { ProjectChatWizard, ProgressScreen } from "@/components/dashboard/ProjectChatWizard";
import { WorkspaceComposerDialog } from "@/components/dashboard/workspace/WorkspaceComposerDialog";
import { Icon, LoadingScreen, LoadingState } from "@/components/ui";
import { CommitHistoryView } from "@/components/dashboard/CommitHistoryView";
import { ProjectSettingsView } from "@/components/dashboard/ProjectSettingsView";
import { readDashboardUrl, writeDashboardUrl } from "@/lib/dashboardUrl";
import { GithubIssuesPanel } from "@/components/dashboard/GithubIssuesPanel";
import { GithubPullRequestsPanel } from "@/components/dashboard/GithubPullRequestsPanel";
import { GithubWorkspacePanel } from "@/components/dashboard/GithubWorkspacePanel";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  enrichProjectWithArtifacts,
  fetchProjectArtifacts,
  fetchProjectMembers,
  fetchProject,
  fetchProjectsByTeam,
} from "@/lib/projectApi";
import { fetchActiveRuns, updateArtifact } from "@/lib/pipelineApi";
import { analyzeDocumentImpact, documentLabel } from "@/lib/documentSyncApi";
import { SpecChangeReview } from "@/components/dashboard/SpecChangeReview";
import { SpecChangeBar } from "@/components/dashboard/SpecChangeBar";
import { latestSnapshot, publishSnapshot, specChanges } from "@/lib/integrationApi";
import { sourceMatchesSnapshot } from "@/lib/specSource";

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
  commits: "커밋 기록",
  settings: "프로젝트 설정",
  graph: "지식 그래프",
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

/* 휴대폰 아래 탭 바: 자주 여는 문서 네 개와 전체 메뉴(사이드바). 휴대폰(767px 이하)에서만 보인다. */
const MOBILE_TABS = [
  { view: "prd", label: "PRD", icon: "doc" },
  { view: "features", label: "기능", icon: "checklist" },
  { view: "api", label: "API", icon: "code" },
  { view: "erd", label: "ERD", icon: "table" },
];
function MobileTabBar({ view, onOpen, onMenu }) {
  return (
    <nav className="mobile-tabbar" aria-label="문서 바로가기">
      {MOBILE_TABS.map((tab) => (
        <button key={tab.view} type="button" className={`mobile-tabbar__item${view === tab.view ? " is-active" : ""}`}
          aria-current={view === tab.view ? "page" : undefined} onClick={() => onOpen(tab.view)}>
          <Icon name={tab.icon} size={20} />
          <span>{tab.label}</span>
        </button>
      ))}
      <button type="button" className={`mobile-tabbar__item${MOBILE_TABS.some((tab) => tab.view === view) ? "" : " is-active"}`} onClick={onMenu}>
        <Icon name="list" size={20} />
        <span>전체</span>
      </button>
    </nav>
  );
}

function DocumentTabBar({ tabs, activeTabId, onActivate, onClose, onToggleSidebar }) {
  if (!tabs.length) return null;

  return (
    <div className="doc-tabbar" style={{
      display: "flex", alignItems: "center", height: 36,
      background: "var(--bg)", borderBottom: "1px solid var(--border)",
      overflowX: "auto", overflowY: "hidden", flexShrink: 0,
    }}>
      <button
        type="button"
        onClick={onToggleSidebar}
        title="사이드바 접기/펼치기"
        aria-label="사이드바 접기/펼치기"
        className="doc-tabbar__toggle"
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
              padding: "8px 8px 8px 14px", flexShrink: 0,
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
              aria-label={`${tab.label} 탭 닫기`}
              className="doc-tab__close"
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
      background: hasWorkspace
        ? "linear-gradient(180deg, color-mix(in srgb, var(--text-1) 3%, transparent) 0%, var(--surface) 100%)"
        : "var(--accent)",
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
          background: "color-mix(in srgb, var(--text-1) 8%, transparent)",
          color: "var(--text-1)",
        }}>
          <Icon name={hasWorkspace ? "box" : "users"} size={26} strokeWidth={1.6} />
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
          background: `${tint(accent, 8)}`, color: accent, fontSize: 11, fontWeight: 900,
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
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedView, setSelectedView] = useState(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [runningPipeline, setRunningPipeline] = useState(null); // { pipelineId, projectId, projectName, teamId }
  const [contextPanelCollapsed, setContextPanelCollapsed] = useState(false);
  // 휴대폰·세로 태블릿처럼 좁은 화면에서는 사이드바를 닫아 두고, 열면 화면 위에 덮어 보인다.
  // (세로 태블릿 768px에서 사이드바 320px가 자리를 차지하면 PRD 본문이 150px 남짓으로 좁아졌다)
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const apply = () => {
      setIsNarrow(query.matches);
      if (query.matches) setContextPanelCollapsed(true);
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  const [openTabs, setOpenTabs] = useState([]); // 동시에 열린 문서 탭들 [{ id, projectId, view, label }]
  const [activeTabId, setActiveTabId] = useState(null);

  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(() => getActiveTeamId());
  const [workspaceDetail, setWorkspaceDetail] = useState(null);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(true);
  const [isLoadingWorkspaceDetail, setIsLoadingWorkspaceDetail] = useState(false);

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
  const [specReview, setSpecReview] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [specStatus, setSpecStatus] = useState(null); // null(모름) | { state: "none"|"match"|"differ", revision }
  const [specStatusTick, setSpecStatusTick] = useState(0);
  const integrationEnabled = process.env.NEXT_PUBLIC_INTEGRATION_ENABLED === "true";
  const incomingProjectHandled = useRef(false);
  // 처음 들어온 주소({ projectId, view, tab }). 화면 상태가 주소를 바꾸기 전에 한 번만 읽어 두고,
  // 그 프로젝트를 실제로 열거나 열 수 없다고 판정하면 비운다(다른 워크스페이스로 바뀌는 동안에도 유지).
  const incomingUrlRef = useRef(typeof window === "undefined" ? {} : readDashboardUrl());
  const selectedProjectIdRef = useRef(null);
  const selectedViewRef = useRef(null);
  const projectsRef = useRef([]);
  const openDocumentRef = useRef(null);
  const [projectSettingsTab, setProjectSettingsTab] = useState("general");
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
    selectedViewRef.current = selectedView;
  }, [selectedProject?.id, selectedView]);

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

  /* 발행 기준과 화면의 문서를 대조해 안내 바가 보여 줄 상태를 정한다. */
  // 아직 발행하지 않은 프로젝트는 문서가 하나씩 불러와질 때마다 다시 묻지 않는다(발행하면 specStatusTick이 바뀐다).
  const unpublishedRef = useRef(new Set());
  useEffect(() => {
    if (!integrationEnabled || !selectedProject?.id) { setSpecStatus(null); return undefined; }
    const unpublishedKey = `${selectedProject.id}:${specStatusTick}`;
    if (unpublishedRef.current.has(unpublishedKey)) { setSpecStatus({ state: "none" }); return undefined; }
    let active = true;
    latestSnapshot(selectedProject.id)
      .then(async (snapshot) => {
        const checks = await Promise.all(snapshot.documents.map((doc) => sourceMatchesSnapshot(selectedProject, doc.type, doc)));
        if (active) setSpecStatus({ state: checks.every(Boolean) ? "match" : "differ", revision: snapshot.revision, snapshotId: snapshot.snapshotId });
      })
      .catch((error) => {
        if (error.code === "SPEC_NOT_PUBLISHED") unpublishedRef.current.add(unpublishedKey);
        if (active) setSpecStatus(error.code === "SPEC_NOT_PUBLISHED" ? { state: "none" } : null);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 문서 원본이 바뀔 때만 다시 대조한다
  }, [integrationEnabled, selectedProject?.id, selectedProject?.artifactSources, specStatusTick]);

  /* 승인을 기다리는 변경안(지금 기준에서 만든 것만) 수. 안내 바에 바로가기를 띄운다. 탭으로 돌아오면 다시 센다. */
  const [pendingChanges, setPendingChanges] = useState(null);
  useEffect(() => {
    const snapshotId = specStatus?.snapshotId;
    if (!integrationEnabled || !selectedProject?.id || !snapshotId) { setPendingChanges(null); return undefined; }
    let active = true;
    const load = () => specChanges(selectedProject.id, 0)
      .then((page) => {
        const ready = (page?.content ?? []).filter((item) => item.status === "READY" && item.snapshotId === snapshotId);
        if (active) setPendingChanges({ count: ready.length, latestId: ready[0]?.proposalId ?? null });
      })
      .catch(() => { if (active) setPendingChanges(null); });
    load();
    const onFocus = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onFocus);
    return () => { active = false; document.removeEventListener("visibilitychange", onFocus); };
  }, [integrationEnabled, selectedProject?.id, specStatus?.snapshotId]);

  useEffect(() => {
    runningPipelineRef.current = runningPipeline;
  }, [runningPipeline]);

  useEffect(() => {
    if (!documentSync || !["complete", "error"].includes(documentSync.phase)) return undefined;
    const timeoutId = window.setTimeout(() => setDocumentSync(null), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [documentSync]);

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

  // 문서를 저장하면 서버가 version을 올린다. 화면의 문서 내용은 그대로 두고
  // 헤더의 버전 표시와 명세 기준 비교에 쓰는 artifactSources만 서버 값으로 맞춘다.
  const refreshArtifactSources = useCallback(async (projectId) => {
    try {
      const artifacts = await fetchProjectArtifacts(projectId);
      if (artifacts.length === 0) return;
      const sources = enrichProjectWithArtifacts({}, artifacts).artifactSources;
      const withSources = (p) => (p?.id === projectId ? { ...p, artifactSources: sources } : p);
      setSelectedProject(withSources);
      setProjects((prev) => prev.map(withSources));
    } catch (error) {
      console.error("문서 버전 확인 실패:", error);
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
      let currentRunningPipeline = runningPipelineRef.current;
      // 새로고침하거나 다시 들어온 경우: 서버에서 진행 중인 생성을 찾아 진행 화면을 이어 보인다.
      if (!currentRunningPipeline) {
        const runs = await fetchActiveRuns().catch(() => []);
        const run = runs.find((r) => (baseList ?? []).some((p) => String(p.id) === String(r.projectId)));
        if (run) {
          const project = baseList.find((p) => String(p.id) === String(run.projectId));
          currentRunningPipeline = {
            pipelineId: run.pipelineId,
            projectId: run.projectId,
            projectName: project?.name ?? "새 프로젝트",
            teamId,
          };
          runningPipelineRef.current = currentRunningPipeline;
          setRunningPipeline(currentRunningPipeline);
        }
      }
      const mergedList = mergeWorkspaceProjects(
        baseList,
        currentRunningPipeline?.teamId === teamId ? currentRunningPipeline : null
      );

      const runningProjectId = currentRunningPipeline?.teamId === teamId
        ? String(currentRunningPipeline.projectId)
        : null;

      const nextSelected = (
        mergedList.find((project) => String(project.id) === (incomingUrlRef.current.projectId ?? readDashboardUrl().projectId))
        ?? mergedList.find((project) => String(project.id) === String(selectedProjectIdRef.current))
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
        const fromUrl = incomingUrlRef.current.projectId ? incomingUrlRef.current : readDashboardUrl();
        if (String(nextSelected.id) === incomingUrlRef.current.projectId) incomingUrlRef.current = {};
        const urlView = String(nextSelected.id) === fromUrl.projectId && DOC_LABELS[fromUrl.view] ? fromUrl.view : null;
        const resolvedView = runningProjectId && nextSelected.id === runningProjectId ? null : (urlView ?? "prd");
        if (urlView === "settings" && fromUrl.tab) setProjectSettingsTab(fromUrl.tab);
        setSelectedView((current) => urlView ?? current ?? resolvedView);
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

  useEffect(() => {
    if (authLoading || !user || isLoadingWorkspaces || incomingProjectHandled.current) return;
    const requested = incomingUrlRef.current.projectId;
    if (!/^[1-9][0-9]*$/.test(requested || "")) { incomingProjectHandled.current = true; return; }
    incomingProjectHandled.current = true;
    fetchProject(requested).then((project) => {
      if (!project) { rejectUnreachableProjectRef.current(); return; }
      if (project.teamId != null && String(project.teamId) !== String(activeWorkspaceId)) applyActiveWorkspaceId(project.teamId);
    }).catch(() => rejectUnreachableProjectRef.current());
  }, [authLoading, user, isLoadingWorkspaces, activeWorkspaceId]);

  projectsRef.current = projects;

  // 화면 상태를 주소에 옮겨 둔다. 브라우저 뒤로·앞으로와 새로고침이 같은 문서를 연다.
  // 처음 주소에 프로젝트가 없으면(그냥 /dashboard) 기록을 늘리지 않고 바꿔 쓴다.
  useEffect(() => {
    if (!selectedProject?.id) return;
    const current = readDashboardUrl();
    writeDashboardUrl(
      { projectId: selectedProject.id, view: selectedView, tab: selectedView === "settings" ? projectSettingsTab : null },
      { replace: !current.projectId || (current.projectId === String(selectedProject.id) && !current.view) },
    );
  }, [selectedProject?.id, selectedView, projectSettingsTab]);

  /** 주소의 프로젝트를 열 수 없으면 알리고, 주소를 지금 보고 있는 화면으로 되돌린다. */
  function rejectUnreachableProject() {
    incomingUrlRef.current = {};
    toast.error("이 프로젝트를 열 수 없습니다. 권한이 없거나 삭제된 프로젝트입니다.");
    const current = selectedProjectIdRef.current;
    writeDashboardUrl(current ? { projectId: current, view: selectedViewRef.current } : {}, { replace: true });
  }
  const rejectUnreachableProjectRef = useRef(rejectUnreachableProject);
  rejectUnreachableProjectRef.current = rejectUnreachableProject;

  // 뒤로·앞으로(또는 navigateDashboard)로 주소가 바뀌면 그 주소의 문서를 연다.
  useEffect(() => {
    function onPopState() {
      const { projectId, view, tab } = readDashboardUrl();
      if (!projectId) return;
      const project = projectsRef.current.find((item) => String(item.id) === projectId);
      if (project) {
        openDocumentRef.current?.(project, DOC_LABELS[view] ? view : "prd", view === "settings" ? tab || "general" : undefined);
        return;
      }
      // 다른 워크스페이스의 프로젝트면 그 워크스페이스로 바꾼다. 목록을 다시 불러올 때 주소의 문서를 연다.
      fetchProject(projectId).then((found) => {
        if (found?.teamId != null) applyActiveWorkspaceId(found.teamId);
        else rejectUnreachableProjectRef.current();
      }).catch(() => rejectUnreachableProjectRef.current());
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (authLoading) {
    return <LoadingScreen message="로그인 상태를 확인하는 중…" />;
  }

  if (!user) {
    return null;
  }

  /** 삭제된 프로젝트를 목록과 탭에서 빼고, 보고 있던 프로젝트였다면 다음 프로젝트를 연다. */
  function removeProjectFromScreen(projectId) {
    const remainingProjects = projects.filter((current) => String(current.id) !== String(projectId));
    setProjects(remainingProjects);
    setOpenTabs((prev) => prev.filter((t) => String(t.projectId) !== String(projectId)));

    if (String(selectedProject?.id) === String(projectId)) {
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
  }

  /** 프로젝트 설정에서 이름·설명·상태를 바꾸면 목록과 열린 화면의 표시만 새 값으로 맞춘다. */
  async function refreshProjectSummaries() {
    if (activeWorkspaceId == null) return;
    try {
      const list = await fetchProjectsByTeam(activeWorkspaceId);
      const merge = (project) => {
        const fresh = list.find((item) => String(item.id) === String(project?.id));
        return fresh ? { ...project, name: fresh.name, description: fresh.description, status: fresh.status } : project;
      };
      setProjects((prev) => prev.map(merge));
      setSelectedProject((current) => (current ? merge(current) : current));
    } catch (error) {
      console.error("프로젝트 목록 갱신 실패:", error);
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
    const alreadyLoaded = !!project.artifactIds && (!integrationEnabled || !!project.artifactSources);
    if (!alreadyLoaded && (!isRunningActiveWorkspace || String(project.id) !== String(runningPipeline?.projectId))) {
      loadArtifacts(project);
    }
  }

  /** tab은 프로젝트 설정의 탭. 주소에서 열 때만 넘기고, 사이드바에서 열면 일반 탭부터 연다. */
  function handleOpenDocument(project, view, tab) {
    if (view === "settings") {
      const sameSettings = selectedView === "settings" && String(selectedProject?.id) === String(project.id);
      setProjectSettingsTab(tab ?? (sameSettings ? projectSettingsTab : "general"));
    }
    setSelectedProject(project);
    setSelectedView(view);
    setShowWizard(false);
    openTab(buildDocumentTab(project, view));
    if (!project.artifactIds || (integrationEnabled && !project.artifactSources)) {
      loadArtifacts(project);
    }
  }
  openDocumentRef.current = handleOpenDocument;

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
    refreshArtifactSources(projectSnapshot.id);

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
        projectId: projectWithSource?.id,
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
          refreshArtifactSources(projectSnapshot.id);
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

  async function handleProposeDocument({ sourceType, document, deferReview = false }) {
    if (!integrationEnabled) return false;
    if (!canEditDocType(myProjectRole, sourceType)) throw new Error("이 문서를 수정할 권한이 없습니다.");
    try {
      const snapshot = await latestSnapshot(selectedProject.id);
      const source = snapshot.documents.find((item) => item.type === sourceType);
      if (!source) throw new Error("발행 기준에 대상 문서가 없습니다. PM이 기준을 다시 발행해야 합니다.");
      if (!await sourceMatchesSnapshot(selectedProject, sourceType, source)) throw new Error("화면의 문서와 발행 기준이 다릅니다. 문서를 다시 불러온 뒤 수정해 주세요.");
      const review = { project: selectedProject, draft: { sourceType, document, snapshot } };
      if (deferReview) {
        return {
          pendingApproval: true,
          openReview: () => setSpecReview(review),
        };
      }
      setSpecReview(review);
      return true;
    } catch (error) {
      if (error.code === "SPEC_NOT_PUBLISHED") return false;
      throw error;
    }
  }

  async function handlePublishSnapshot() {
    setPublishing(true);
    try { const snapshot = await publishSnapshot(selectedProject.id); showToast("success", `기준 명세 ${snapshot.revision}차 발행본을 만들었습니다.`); setSpecStatusTick((n) => n + 1); }
    catch (error) { showToast("error", error.message); }
    finally { setPublishing(false); }
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

  async function handleSelectWorkspace(nextWorkspaceId) {
    if (!nextWorkspaceId || nextWorkspaceId === activeWorkspaceId) return;

    if (runningPipeline && runningPipeline.teamId === activeWorkspaceId) {
      const proceed = await confirmDialog("이 워크스페이스에서 파이프라인이 실행 중입니다. 다른 워크스페이스로 이동해도 실행은 계속됩니다. 이동할까요?");
      if (!proceed) return;
    }

    applyActiveWorkspaceId(nextWorkspaceId);
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
      // 서버는 생성을 마친 프로젝트를 '기획 중'(draft)으로 둔다. 새로고침 전후 표시가 같도록 맞춘다.
      status: "draft",
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

  // 워크스페이스가 하나도 없으면 사이드바에는 계정 줄만 두고, 가운데에 시작 카드만 보여준다
  const workspaceOnboarding = showWizard && !activeWorkspaceId && !isLoadingWorkspaces;

  return (
    <>
      {integrationEnabled && specReview && <SpecChangeReview
        project={specReview.project} draft={specReview.draft} proposalId={specReview.proposalId}
        canApprove={myProjectRole === "PM"} allowedTargets={ROLE_DOCUMENT_PERMISSIONS[myProjectRole] || []}
        onClose={() => setSpecReview(null)} onApproved={async () => { await loadArtifacts(specReview.project); setSpecStatusTick((n) => n + 1); }}
      />}
      <style>{`
        @keyframes dash-panel-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        @keyframes document-sync-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <div className="dash-root" style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "var(--surface)",
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      }}>
        {isNarrow && !contextPanelCollapsed && (
          <div className="ctx-backdrop" aria-hidden="true" onClick={() => setContextPanelCollapsed(true)} />
        )}
        <ContextPanel
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
          selectedView={selectedView}
          onSelectView={(view) => {
            setSelectedView(view);
            if (isNarrow) setContextPanelCollapsed(true);
          }}
          onOpenDocument={(...args) => {
            handleOpenDocument(...args);
            if (isNarrow) setContextPanelCollapsed(true);
          }}
          onCreateProject={(...args) => {
            handleOpenCreateProject(...args);
            if (isNarrow) setContextPanelCollapsed(true);
          }}
          onOpenWorkspaceComposer={() => {
            setComposerError("");
            setComposerOpen(true);
          }}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          workspacesLoading={isLoadingWorkspaces}
          onSelectWorkspace={handleSelectWorkspace}
          workspace={workspaceDetail?.team ?? activeWorkspace}
          documentSync={documentSync}
          editingDocumentType={editingDocumentType}
          collapsed={contextPanelCollapsed}
          accountOnly={workspaceOnboarding}
        />

        {showWizard ? (
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
              onLeave={() => {
                // 생성은 서버에서 계속된다. 진행 화면만 닫고, 프로젝트를 다시 누르면 이어서 본다.
                setSelectedProject(null);
                setShowWizard(true);
              }}
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
            <div key={selectedProject.id} style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", animation: "dash-panel-in 0.18s ease" }}>
              {integrationEnabled && (
                <SpecChangeBar
                  projectId={selectedProject.id}
                  status={specStatus}
                  pending={pendingChanges}
                  canPublish={myProjectRole === "PM"}
                  publishing={publishing}
                  onReload={() => loadArtifacts(selectedProject)}
                  onPublish={handlePublishSnapshot}
                />
              )}
              <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
              {selectedView === "prd" ? (
                <PrdPanel
                  project={selectedProject}
                  readOnly={!canEditDocType(myProjectRole, "PRD")}
                  onDocumentChange={handlePrdDocumentChange}
                  onDocumentSaved={handleDocumentSaved}
                  onDocumentEditingChange={handleDocumentEditingChange}
                  onProposeDocument={handleProposeDocument}
                />
              ) : selectedView === "features" ? (
                <FeaturesPanel project={selectedProject} readOnly={!canEditDocType(myProjectRole, "FEATURE_LIST")} onDocumentSaved={handleDocumentSaved} onDocumentEditingChange={handleDocumentEditingChange} onProposeDocument={handleProposeDocument} />
              ) : selectedView === "api" ? (
                <ApiSpecPanel project={selectedProject} readOnly={!canEditDocType(myProjectRole, "API_SPEC")} onDocumentSaved={handleDocumentSaved} onDocumentEditingChange={handleDocumentEditingChange} onProposeDocument={handleProposeDocument} />
              ) : selectedView === "erd" ? (
                <ErdPanel project={selectedProject} readOnly={!canEditDocType(myProjectRole, "DB_SCHEMA")} onDocumentSaved={handleDocumentSaved} onDocumentEditingChange={handleDocumentEditingChange} onProposeDocument={handleProposeDocument} />
              ) : selectedView === "graph" ? (
                <KnowledgeGraph project={selectedProject} />
              ) : selectedView === "qa" ? (
                <QaTestPanel project={selectedProject} />
              ) : selectedView === "github" ? (
                <GithubWorkspacePanel project={selectedProject} onSelectView={(view) => handleOpenDocument(selectedProject, view)} />
              ) : selectedView === "issues" ? (
                <GithubIssuesPanel project={selectedProject} canManage={myProjectRole === "PM"} />
              ) : selectedView === "pulls" ? (
                <GithubPullRequestsPanel project={selectedProject} canManage={myProjectRole === "PM"} />
              ) : selectedView === "commits" ? (
                <CommitHistoryView project={selectedProject} />
              ) : selectedView === "settings" ? (
                <ProjectSettingsView
                  project={selectedProject}
                  page={projectSettingsTab}
                  onChangePage={setProjectSettingsTab}
                  onProjectGone={() => removeProjectFromScreen(selectedProject.id)}
                  onProjectChanged={refreshProjectSummaries}
                />
              ) : (
                <AgentPanel project={selectedProject} view={selectedView} />
              )}
              </div>
              <MobileTabBar view={selectedView} onOpen={(view) => handleOpenDocument(selectedProject, view)}
                onMenu={() => setContextPanelCollapsed(false)} />
            </div>
          </div>
        ) : isLoadingProjects ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LoadingState label="프로젝트를 불러오는 중…" />
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
