"use client";

/**
 * ContextPanel — 두 번째 패널 (320px)
 * Claude 앱처럼 사이드바 하나에 모두 담는다(따로 있던 맨 왼쪽 레일은 없앴다).
 *   맨 위: 워크스페이스 전환 드롭다운
 *   가운데: 프로젝트 검색과 프로젝트 목록 + 아코디언 서브 문서 트리
 *   맨 아래: 계정 줄(프로필·설정·로그아웃 메뉴)과 알림
 *   프로젝트 클릭 → 펼치기/접기, 서브 아이템 클릭 → 해당 문서 뷰 선택
 * 모양은 theme.css의 .ctx-* 클래스가 정한다.
 */

import { useState } from "react";
import { ActionButton, Badge, Icon, SearchInput } from "@/components/ui";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SidebarAccount } from "./SidebarAccount";

const ROLE_LABEL = { OWNER: "소유자", MEMBER: "멤버", GUEST: "게스트" };

/* ── 상태 배지 ── */
const STATUS_MAP = {
  active:    { label: "진행 중", tone: "success" },
  draft:     { label: "기획 중", tone: "neutral" },
  completed: { label: "완료",    tone: "neutral" },
  archived:  { label: "보관",    tone: "neutral" },
  running:   { label: "생성 중", tone: "info" },
};

/* ── 프로젝트 서브 문서 목록 (아이콘은 ui/Icon 이름) ── */
const PROJECT_DOCS = [
  { id: "prd",       label: "PRD",         icon: "doc" },
  { id: "features",  label: "기능 명세서", icon: "checklist" },
  { id: "api",       label: "API 명세서",  icon: "code" },
  { id: "erd",       label: "ERD 명세서",  icon: "database" },
  { id: "graph",     label: "지식 그래프", icon: "graph" },
  { id: "github",    label: "GitHub 작업", icon: "box" },
  { id: "issues",    label: "Issues 전체", icon: "flag" },
  { id: "pulls",     label: "PRs 전체",    icon: "shuffle" },
  { id: "commits",   label: "커밋 기록",   icon: "list" },
  { id: "qa",        label: "QA 테스트",   icon: "check" },
];

/* 문서 목록 맨 아래에 따로 두는 프로젝트 설정. 본문에 가로 탭 화면(ProjectSettingsView)으로 열린다. */
const SETTINGS_DOC = { id: "settings", label: "프로젝트 설정", icon: "wrench" };

const SYNC_DOCUMENT_TYPES = {
  prd: "PRD",
  features: "FEATURE_LIST",
  api: "API_SPEC",
  erd: "DB_SCHEMA",
};

/** 문서 옆 작은 상태 표시. tone은 ui/Badge와 같은 이름을 쓴다. */
function documentSyncStatus(sync, docId, editingDocumentType) {
  const type = SYNC_DOCUMENT_TYPES[docId];
  if (!type) return null;
  if (editingDocumentType === type) return { label: "수정 중", tone: "info", spinning: true };
  if (!sync) return null;

  const target = sync.targets?.find(item => item.type === type);
  if (target) {
    if (target.status === "completed") return { label: "반영 완료", tone: "success" };
    if (target.status === "failed") return { label: "반영 실패", tone: "danger" };
    return { label: "수정 중", tone: "info", spinning: true };
  }

  if (sync.sourceType !== type) return null;
  if (sync.phase === "analyzing") return { label: "분석 중", tone: "info", spinning: true };
  if (sync.phase === "error") return { label: "확인 실패", tone: "danger" };
  return { label: "저장 완료", tone: "success" };
}

/* ══════════════════════════════════════
   PROJECTS PANEL
══════════════════════════════════════ */
function ProjectsPanel({
  projects,
  selectedProject,
  onSelectProject,
  selectedView,
  onSelectView,
  onOpenDocument,
  onCreateProject,
  onOpenWorkspaceComposer,
  workspaces,
  activeWorkspaceId,
  workspacesLoading,
  onSelectWorkspace,
  workspace,
  documentSync,
  editingDocumentType,
}) {
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState({}); // { [projectId]: boolean }

  const filtered = (projects || []).filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  function toggleExpand(projectId) {
    setExpanded(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  }

  function handleProjectClick(project) {
    // 프로젝트 헤더 클릭 → 선택 + 펼치기 토글
    onSelectProject(project);
    toggleExpand(project.id);
  }

  function handleDocClick(project, docId, e) {
    e.stopPropagation();
    if (onOpenDocument) {
      onOpenDocument(project, docId);
    } else {
      onSelectProject(project);
      onSelectView?.(docId);
    }
  }

  return (
    <div className="ctx">
      {/* 헤더: 워크스페이스 전환 */}
      <div className="ctx-head">
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeId={activeWorkspaceId}
          onSelect={onSelectWorkspace}
          onCreate={onOpenWorkspaceComposer}
          loading={workspacesLoading}
          subtitle={workspace ? `${ROLE_LABEL[workspace.viewerRole] ?? "멤버"} · 프로젝트 ${projects.length}개` : undefined}
        />
      </div>

      {workspace && (
        <div className="ctx-tools">
          <SearchInput value={search} onChange={setSearch} placeholder="프로젝트 검색" label="프로젝트 검색" />
          <div className="ctx-section">
            <span>프로젝트</span>
            {onCreateProject && (
              <ActionButton variant="ghost" size="sm" iconOnly title="새 프로젝트" aria-label="새 프로젝트" onClick={onCreateProject}>
                <Icon name="plus" size={14} />
              </ActionButton>
            )}
          </div>
        </div>
      )}

      {/* 트리 목록 */}
      <div className="ctx-tree">
        {!workspace ? null : filtered.length === 0 ? (
          <div className="ctx-empty">{search ? "검색 결과가 없습니다." : "아직 프로젝트가 없습니다."}</div>
        ) : (
          filtered.map(project => {
            const isSelected = selectedProject?.id === project.id;
            const isOpen     = !!expanded[project.id];
            const status     = STATUS_MAP[project.status] || STATUS_MAP.draft;

            return (
              <div key={project.id} className="ctx-project">
                <ProjectRow
                  project={project}
                  status={status}
                  isSelected={isSelected}
                  isOpen={isOpen}
                  onClick={() => handleProjectClick(project)}
                />

                {isOpen && (
                  <div className="ctx-docs">
                    {PROJECT_DOCS.map(doc => (
                      <DocItem
                        key={doc.id}
                        doc={doc}
                        isActive={isSelected && selectedView === doc.id}
                        syncStatus={isSelected ? documentSyncStatus(documentSync, doc.id, editingDocumentType) : null}
                        onClick={e => handleDocClick(project, doc.id, e)}
                      />
                    ))}
                    <DocItem
                      doc={SETTINGS_DOC}
                      muted
                      isActive={isSelected && selectedView === SETTINGS_DOC.id}
                      onClick={e => handleDocClick(project, SETTINGS_DOC.id, e)}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <SidebarAccount />
    </div>
  );
}

/* 프로젝트 삭제는 사이드바에서 하지 않는다. 프로젝트 설정 > 삭제 탭 한 곳에서만 한다. */
function ProjectRow({ project, status, isSelected, isOpen, onClick }) {
  return (
    <div className={`ctx-row${isSelected ? " is-selected" : ""}`}>
      <button type="button" className="ctx-row__main" onClick={onClick} aria-expanded={isOpen}>
        <svg className={`ctx-row__chevron${isOpen ? " is-open" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span className="ctx-row__name">{project.name}</span>
        <Badge tone={status.tone}>
          {project.status === "running" && <span className="ctx-spinner" aria-hidden="true" />}
          {status.label}
        </Badge>
      </button>

    </div>
  );
}

/* ── 서브 문서 아이템 ── */
function DocItem({ doc, isActive, syncStatus, onClick, muted = false }) {
  return (
    <button type="button" className={`ctx-doc${isActive ? " is-active" : ""}${muted ? " ctx-doc--muted" : ""}`} onClick={onClick} aria-current={isActive ? "page" : undefined}>
      <Icon name={doc.icon} size={14} strokeWidth={1.8} />
      <span className="ctx-doc__label">{doc.label}</span>
      {syncStatus && (
        <Badge tone={syncStatus.tone} className="ctx-doc__sync">
          {syncStatus.spinning && <span className="ctx-spinner" aria-hidden="true" />}
          {syncStatus.label}
        </Badge>
      )}
    </button>
  );
}

export function ContextPanel({
  projects,
  selectedProject,
  onSelectProject,
  selectedView,
  onSelectView,
  onOpenDocument,
  onCreateProject,
  onOpenWorkspaceComposer,
  workspaces = [],
  activeWorkspaceId,
  workspacesLoading = false,
  onSelectWorkspace,
  workspace,
  documentSync,
  editingDocumentType,
  collapsed = false,
  accountOnly = false,
}) {
  if (accountOnly && !collapsed) {
    // 워크스페이스가 없을 때: 목록·검색은 보여줄 게 없어 계정 줄만 남긴다
    return (
      <div className="ctx-panel ctx-panel--onboarding">
        <div className="ctx"><div style={{ flex: 1 }} /><SidebarAccount /></div>
      </div>
    );
  }
  return (
    <div className={`ctx-panel${collapsed ? " is-collapsed" : ""}`}>
      {collapsed ? null : (
        <ProjectsPanel
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
          selectedView={selectedView}
          onSelectView={onSelectView}
          onOpenDocument={onOpenDocument}
          onCreateProject={onCreateProject}
          onOpenWorkspaceComposer={onOpenWorkspaceComposer}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          workspacesLoading={workspacesLoading}
          onSelectWorkspace={onSelectWorkspace}
          workspace={workspace}
          documentSync={documentSync}
          editingDocumentType={editingDocumentType}
        />
      )}
    </div>
  );
}
