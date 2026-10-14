"use client";

/**
 * ContextPanel — 두 번째 패널 (320px)
 *   맨 위: 워크스페이스 전환(WorkspaceSwitcher)
 *   아래: 프로젝트 목록 + 아코디언 서브 문서 트리
 *   프로젝트 클릭 → 펼치기/접기, 서브 아이템 클릭 → 해당 문서 뷰 선택
 */

import { tint } from "@/lib/color";
import { useState } from "react";
import Link from "next/link";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

/* ── 색상 토큰 ── */
const C = {
  panel:      "var(--bg)",
  border:     "rgba(0,0,0,0.07)",
  text:       "var(--text-1)",
  muted:      "#7a7a7a",
  sub:        "var(--text-3)",
  hover:      "rgba(0,0,0,0.04)",
  active:     "color-mix(in srgb, var(--text-1) 12%, transparent)",
  activeBdr:  "color-mix(in srgb, var(--text-1) 25%, transparent)",
  accent:     "var(--text-2)",
  accentDim:  "color-mix(in srgb, var(--text-2) 15%, transparent)",
  input:      "var(--surface)",
  inputBdr:   "rgba(0,0,0,0.09)",
  commit:     "var(--text-1)",
  itemHover:  "var(--surface)",
};

/* ── 상태 배지 ── */
const STATUS_MAP = {
  active:    { label: "진행 중", color: "var(--text-3)" },
  draft:     { label: "기획 중", color: "#6b7280" },
  completed: { label: "완료",   color: "var(--text-2)" },
  archived:  { label: "보관",   color: "#4b5563" },
  running:   { label: "생성 중", color: "#6b55dc" },
};

/* ── 프로젝트 서브 문서 목록 ── */
const PROJECT_DOCS = [
  { id: "prd",       label: "PRD",        icon: "✏️" },
  { id: "features",  label: "기능 명세서", icon: "⚡" },
  { id: "api",       label: "API 명세서",  icon: "🔗" },
  { id: "erd",       label: "ERD 명세서",  icon: "🗄️" },
  { id: "graph",     label: "지식 그래프",  icon: "🕸" },
  { id: "github",    label: "GitHub 작업",  icon: "⌘"  },
  { id: "issues",    label: "Issues 전체",  icon: "⚠️" },
  { id: "pulls",     label: "PRs 전체",     icon: "⇄"  },
  { id: "commits",   label: "커밋 기록",    icon: "•"  },
  { id: "qa",        label: "QA",          icon: "✓"  },
];

const SYNC_DOCUMENT_TYPES = {
  prd: "PRD",
  features: "FEATURE_LIST",
  api: "API_SPEC",
  erd: "DB_SCHEMA",
};

function documentSyncStatus(sync, docId, editingDocumentType) {
  const type = SYNC_DOCUMENT_TYPES[docId];
  if (!type) return null;
  if (editingDocumentType === type) {
    return { label: "수정 중", color: "#2563eb", background: "rgba(37,99,235,0.09)", spinning: true };
  }
  if (!sync) return null;

  const target = sync.targets?.find(item => item.type === type);
  if (target) {
    if (target.status === "completed") return { label: "반영 완료", color: "#059669", background: "rgba(16,185,129,0.09)" };
    if (target.status === "failed") return { label: "반영 실패", color: "#dc2626", background: "rgba(239,68,68,0.09)" };
    return { label: "수정 중", color: "#2563eb", background: "rgba(37,99,235,0.09)", spinning: true };
  }

  if (sync.sourceType !== type) return null;
  if (sync.phase === "analyzing") return { label: "분석 중", color: "#7c3aed", background: "rgba(124,58,237,0.09)", spinning: true };
  if (sync.phase === "error") return { label: "확인 실패", color: "#dc2626", background: "rgba(239,68,68,0.09)" };
  return { label: "저장 완료", color: "#059669", background: "rgba(16,185,129,0.09)" };
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
  onDeleteProject,
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* 헤더: 워크스페이스 전환 */}
      <div style={{ padding: "12px 12px 14px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ marginBottom: 14 }}>
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeId={activeWorkspaceId}
            onSelect={onSelectWorkspace}
            onCreate={onOpenWorkspaceComposer}
            loading={workspacesLoading}
            subtitle={workspace ? `${({ OWNER: "소유자", MEMBER: "멤버", GUEST: "게스트" })[workspace.viewerRole] ?? "멤버"} · 프로젝트 ${projects.length}개` : undefined}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 6px 10px" }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            letterSpacing: "0.07em", textTransform: "uppercase",
          }}>
            프로젝트
          </div>
          {onCreateProject && (
            <button
              onClick={onCreateProject}
              title="새 프로젝트"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 26, height: 26, borderRadius: 8,
                background: "none", border: `1px solid ${C.inputBdr}`,
                color: C.muted, fontSize: 16, cursor: "pointer",
                transition: "all 0.12s",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.accentDim; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.muted; }}
            >+</button>
          )}
        </div>

        {/* 검색 */}
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.sub }}
               width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="프로젝트 검색..."
            style={{
              width: "100%", padding: "10px 12px 10px 32px",
              background: C.input, border: `1px solid ${C.inputBdr}`,
              borderRadius: 11, fontSize: 12, color: C.text,
              outline: "none", boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {/* 트리 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 14px" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "32px 12px", textAlign: "center", color: C.sub, fontSize: 13 }}>
            {search ? "검색 결과가 없습니다" : workspace ? "아직 프로젝트가 없습니다" : "먼저 워크스페이스를 선택해 주세요"}
          </div>
        ) : (
          filtered.map(project => {
            const isSelected  = selectedProject?.id === project.id;
            const isOpen      = !!expanded[project.id];
            const status      = STATUS_MAP[project.status] || STATUS_MAP.draft;

            return (
              <div key={project.id} style={{ marginBottom: 2 }}>
                {/* 프로젝트 헤더 행 */}
                <ProjectRow
                  project={project}
                  status={status}
                  isSelected={isSelected}
                  isOpen={isOpen}
                  onClick={() => handleProjectClick(project)}
                  onDelete={onDeleteProject ? (e) => { e.stopPropagation(); onDeleteProject(project); } : null}
                />

                {/* 서브 문서 아이템 (펼쳐졌을 때만) */}
                {isOpen && (
                  <div style={{ paddingLeft: 8, marginTop: 1 }}>
                    {PROJECT_DOCS.map(doc => {
                      const isDocActive = isSelected && selectedView === doc.id;
                      return (
                        <DocItem
                          key={doc.id}
                          doc={doc}
                          projectName={project.name}
                          isActive={isDocActive}
                          syncStatus={isSelected ? documentSyncStatus(documentSync, doc.id, editingDocumentType) : null}
                          onClick={e => handleDocClick(project, doc.id, e)}
                        />
                      );
                    })}
                    <Link href={`/settings/project/${project.id}/general`} className="ctx-settings-link">프로젝트 설정</Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ProjectRow({ project, status, isSelected, isOpen, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative" }}
    >
      <button
        onClick={onClick}
        style={{
          display:       "flex",
          alignItems:    "center",
          gap:           8,
          width:         "100%",
          // 삭제 버튼이 절대배치로 오른쪽에 겹쳐 뜨므로 그만큼 자리를 비워 상태 배지를 밀어준다
          padding:       hovered && onDelete ? "11px 40px 11px 12px" : "11px 12px",
          borderRadius:  12,
          border:        isSelected ? `1px solid ${C.activeBdr}` : `1px solid rgba(0,0,0,0.04)`,
          background:    isSelected ? C.active : hovered ? C.hover : "rgba(0,0,0,0.015)",
          cursor:        "pointer",
          textAlign:     "left",
          transition:    "all 0.12s",
          fontFamily:    "inherit",
        }}
      >
        {/* 화살표 */}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke={isSelected ? C.accent : C.sub} strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>

        {/* 프로젝트 이름 */}
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 700,
          color: isSelected ? C.accent : C.text,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          paddingRight: 0,
        }}>
          {project.name}
        </span>

        {/* 상태 배지 */}
        {(
          <span style={{
            display: "flex", alignItems: "center", gap: 4,
            fontSize: 10, fontWeight: 700, color: status.color,
            background: `${tint(status.color, 9)}`, padding: "4px 7px",
            borderRadius: 100, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {project.status === "running" && (
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ animation: "ctx-spin 0.9s linear infinite", flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
              </svg>
            )}
            {status.label}
          </span>
        )}
      </button>

      {/* 삭제 버튼 — 워크스페이스 OWNER에게만 onDelete가 내려온다.
          서버도 ProjectService.delete에서 requireOwner로 막고 있어 여기는 노출 제어일 뿐이다. */}
      {hovered && onDelete && (
        <button
          onClick={onDelete}
          title="프로젝트 삭제"
          style={{
            position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, borderRadius: 7,
            background: "none", border: "none",
            color: "#f87171", cursor: "pointer",
            transition: "all 0.12s",
            fontFamily: "inherit",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── 서브 문서 아이템 ── */
function DocItem({ doc, projectName, isActive, syncStatus, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          7,
        width:        "100%",
        padding:      "8px 10px 8px 22px",
        borderRadius: 10,
        border:       isActive ? `1px solid ${C.activeBdr}` : "1px solid transparent",
        background:   isActive ? C.accentDim : hovered ? C.hover : "transparent",
        cursor:       "pointer",
        textAlign:    "left",
        transition:   "all 0.1s",
        marginBottom: 3,
        fontFamily:   "inherit",
      }}
    >
      {/* 들여쓰기 연결선 */}
      <div style={{
        width:       1,
        height:      16,
        background:  isActive ? C.accent : C.sub,
        flexShrink:  0,
        marginLeft:  -12,
        marginRight: 5,
        borderRadius: 1,
        opacity:     isActive ? 1 : 0.5,
      }} />

      {/* 문서 타입 라벨 */}
      <span style={{
        fontSize:  12,
        fontWeight: isActive ? 600 : 400,
        color:     isActive ? C.accent : C.muted,
        overflow:  "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {doc.label}
      </span>
      {syncStatus && (
        <span style={{
          marginLeft: "auto", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 6px", borderRadius: 999, background: syncStatus.background,
          color: syncStatus.color, fontSize: 9, fontWeight: 800,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", border: `1.5px solid ${syncStatus.color}`,
            borderTopColor: syncStatus.spinning ? "transparent" : syncStatus.color,
            background: syncStatus.spinning ? "transparent" : syncStatus.color,
            animation: syncStatus.spinning ? "ctx-spin 0.8s linear infinite" : "none",
          }} />
          {syncStatus.label}
        </span>
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
  onDeleteProject,
  workspaces = [],
  activeWorkspaceId,
  workspacesLoading = false,
  onSelectWorkspace,
  workspace,
  documentSync,
  editingDocumentType,
  collapsed = false,
}) {
  return (
    <div style={{
      width: collapsed ? 0 : 320, flexShrink: 0, height: "100vh",
      background: C.panel, borderRight: collapsed ? "none" : `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "inherit",
      transition: "width 0.16s ease",
    }}>
      <style>{`@keyframes ctx-spin { to { transform: rotate(360deg); } }`}</style>

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
          onDeleteProject={onDeleteProject}
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
