"use client";

/**
 * ContextPanel — 두 번째 패널 (320px)
 *
 * mode = 'projects'
 *   프로젝트 목록 + 아코디언 서브 문서 트리
 *   프로젝트 클릭 → 펼치기/접기
 *   서브 아이템 클릭 → 해당 문서 뷰 선택
 *
 * mode = 'commit'
 *   커밋 히스토리 + 커밋 폼
 */

import { useState, useEffect, useCallback } from "react";
import { fetchCommits, fetchCommitsByProject, createCommit } from "@/lib/commitApi";

/* ── 색상 토큰 ── */
const C = {
  panel:      "var(--surface)",
  border:     "rgba(0,0,0,0.07)",
  text:       "#1a1916",
  muted:      "#7a7a7a",
  sub:        "var(--text-3)",
  hover:      "rgba(0,0,0,0.04)",
  active:     "rgba(26,25,22,0.12)",
  activeBdr:  "rgba(26,25,22,0.25)",
  accent:     "#6b6960",
  accentDim:  "rgba(107,105,96,0.15)",
  input:      "var(--surface)",
  inputBdr:   "rgba(0,0,0,0.09)",
  commit:     "var(--text-1)",
  itemHover:  "var(--surface)",
};

/* ── 상태 배지 ── */
const STATUS_MAP = {
  active:    { label: "진행중", color: "#a8a69f" },
  draft:     { label: "초안",   color: "#6b7280" },
  completed: { label: "완료",   color: "#6b6960" },
  archived:  { label: "보관",   color: "#4b5563" },
  running:   { label: "생성 중", color: "#6b55dc" },
};

/* ── 프로젝트 서브 문서 목록 ── */
const PROJECT_DOCS = [
  { id: "prd",       label: "PRD",        icon: "✏️" },
  { id: "features",  label: "기능 명세서", icon: "⚡" },
  { id: "api",       label: "API 명세서",  icon: "🔗" },
  { id: "erd",       label: "ERD 명세서",  icon: "🗄️" },
  { id: "qa",        label: "QA",          icon: "✓"  },
];


/* ══════════════════════════════════════
   PROJECTS PANEL
══════════════════════════════════════ */
function ProjectsPanel({
  projects,
  selectedProject,
  onSelectProject,
  selectedView,
  onSelectView,
  onCreateProject,
  onOpenWorkspaceComposer,
  onOpenWorkspaceManage,
  onDeleteProject,
  workspace,
  workspaceLoading,
  onOpenWorkspaceInvite,
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
    onSelectProject(project);
    onSelectView?.(docId);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* 헤더 */}
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{
          padding: 16,
          borderRadius: 16,
          border: `1px solid ${C.inputBdr}`,
          background: "linear-gradient(180deg, rgba(26,25,22,0.03) 0%, rgba(26,25,22,0.015) 100%)",
          marginBottom: 16,
        }}>
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.muted,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}>
              워크스페이스
            </div>
            {workspace && !workspaceLoading ? (
              <button
                type="button"
                onClick={onOpenWorkspaceManage}
                style={{
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: `1px solid ${C.inputBdr}`,
                  background: "var(--surface)",
                  color: C.accent,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                관리
              </button>
            ) : null}
          </div>

          {workspaceLoading ? (
            <div style={{ fontSize: 12, color: C.sub }}>워크스페이스 정보를 불러오고 있어요.</div>
          ) : workspace ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                {workspace.iconUrl && (
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}>
                    <img src={workspace.iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                )}
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: "-.02em" }}>
                  {workspace.teamName ?? workspace.name ?? "워크스페이스"}
                </div>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
              }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 9px",
                  borderRadius: 999,
                  background: workspace.viewerRole === "OWNER" ? "rgba(26,25,22,0.1)" : "rgba(59,130,246,0.08)",
                  color: workspace.viewerRole === "OWNER" ? C.text : "#2563EB",
                }}>
                  {workspace.viewerRole === "OWNER" ? "소유자" : "멤버"}
                </span>
                <span style={{ fontSize: 12, color: C.sub }}>
                  프로젝트 {projects.length}개
                </span>
              </div>
              <div style={{
                fontSize: 12,
                color: C.sub,
                marginTop: 10,
                lineHeight: 1.65,
              }}>
                {workspace.description?.trim() || "워크스페이스 설명이 아직 없습니다."}
              </div>
              <div style={{
                fontSize: 11,
                color: C.muted,
                marginTop: 10,
                lineHeight: 1.6,
              }}>
                이름, 설명, 초대 코드, 권한 관리는 워크스페이스 관리 탭에서 바로 열 수 있어요.
              </div>
            </>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7 }}>
                아직 선택된 워크스페이스가 없습니다.
              </div>
              <button
                type="button"
                onClick={onOpenWorkspaceComposer}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1px solid ${C.inputBdr}`,
                  background: "var(--surface)",
                  color: C.accent,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                워크스페이스 시작하기
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
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
                          onClick={e => handleDocClick(project, doc.id, e)}
                        />
                      );
                    })}
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

function WorkspacePanel({
  workspace,
  workspaceMembers = [],
  workspaceLoading,
  onOpenWorkspaceComposer,
  onOpenWorkspaceManage,
  onOpenWorkspaceInvite,
  onOpenWorkspaceMembers,
}) {
  const previewMembers = workspaceMembers.slice(0, 4);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.muted,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}>
          워크스페이스 관리
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 8, lineHeight: 1.7 }}>
          초대 코드, 워크스페이스 정보, 소유자 이전과 멤버 정리를 한 곳에서 관리합니다.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 16px" }}>
        {workspaceLoading ? (
          <div style={{ padding: "32px 12px", textAlign: "center", color: C.sub, fontSize: 13 }}>
            워크스페이스 정보를 불러오는 중...
          </div>
        ) : !workspace ? (
          <div style={{
            padding: 16,
            borderRadius: 16,
            border: `1px solid ${C.inputBdr}`,
            background: "rgba(26,25,22,0.015)",
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 8 }}>
              아직 관리할 워크스페이스가 없습니다
            </div>
            <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7, marginBottom: 12 }}>
              새 워크스페이스를 만들거나 초대 코드로 참여해 보세요.
            </div>
            <button
              type="button"
              onClick={onOpenWorkspaceComposer}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 12,
                border: `1px solid ${C.inputBdr}`,
                background: "var(--surface)",
                color: C.accent,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              워크스페이스 추가 또는 참여
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{
              padding: 16,
              borderRadius: 16,
              border: `1px solid ${C.inputBdr}`,
              background: "linear-gradient(180deg, rgba(26,25,22,0.03) 0%, rgba(26,25,22,0.015) 100%)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {workspace.iconUrl && (
                    <div style={{
                      width: 26, height: 26, borderRadius: 7, overflow: "hidden", flexShrink: 0,
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}>
                      <img src={workspace.iconUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                  )}
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: "-.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {workspace.teamName ?? workspace.name ?? "워크스페이스"}
                  </div>
                </div>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: workspace.viewerRole === "OWNER" ? "rgba(26,25,22,0.1)" : "rgba(59,130,246,0.08)",
                  color: workspace.viewerRole === "OWNER" ? C.text : "#2563EB",
                  flexShrink: 0,
                }}>
                  {workspace.viewerRole === "OWNER" ? "소유자" : "멤버"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7 }}>
                {workspace.description?.trim() || "워크스페이스 설명이 아직 없습니다."}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <span style={{ fontSize: 11, color: C.sub }}>
                  멤버 {workspaceMembers.length}명
                </span>
                <button
                  type="button"
                  onClick={onOpenWorkspaceInvite}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 10,
                    border: `1px solid ${C.inputBdr}`,
                    background: "var(--surface)",
                    color: C.accent,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  초대 코드
                </button>
                <button
                  type="button"
                  onClick={onOpenWorkspaceManage}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 10,
                    border: `1px solid ${C.inputBdr}`,
                    background: "var(--surface)",
                    color: C.accent,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  기본 정보
                </button>
                <button
                  type="button"
                  onClick={onOpenWorkspaceMembers}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 10,
                    border: `1px solid ${C.inputBdr}`,
                    background: "var(--surface)",
                    color: C.accent,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  권한 관리
                </button>
              </div>
            </div>

            <div style={{
              padding: 16,
              borderRadius: 16,
              border: `1px solid ${C.inputBdr}`,
              background: "var(--surface)",
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.muted,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}>
                멤버 미리보기
              </div>
              {previewMembers.length === 0 ? (
                <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.7 }}>
                  아직 참여한 멤버가 없습니다.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {previewMembers.map((member) => (
                    <div
                      key={member.memberId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: "var(--bg)",
                        border: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                          {member.memberName}
                        </div>
                        <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
                          {member.email || "이메일 정보 없음"}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: member.teamRole === "OWNER" ? "rgba(26,25,22,0.1)" : "rgba(59,130,246,0.08)",
                        color: member.teamRole === "OWNER" ? C.text : "#2563EB",
                        whiteSpace: "nowrap",
                      }}>
                        {member.teamRole === "OWNER" ? "소유자" : "멤버"}
                      </span>
                    </div>
                  ))}
                  {workspaceMembers.length > previewMembers.length && (
                    <div style={{ fontSize: 11, color: C.sub, textAlign: "center", paddingTop: 2 }}>
                      나머지 멤버와 권한 설정은 오른쪽 관리 화면에서 볼 수 있어요.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 프로젝트 헤더 행 ── */
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
          padding:       "11px 12px",
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
            background: `${status.color}18`, padding: "4px 7px",
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

      {/* 삭제 버튼 제거됨 */}
      {false && hovered && onDelete && (
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
function DocItem({ doc, projectName, isActive, onClick }) {
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
        {projectName}_{doc.label}
      </span>
    </button>
  );
}

/* ══════════════════════════════════════
   COMMIT PANEL
══════════════════════════════════════ */
function CommitPanel({ selectedProject }) {
  const [summary,    setSummary]    = useState("");
  const [desc,       setDesc]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [committed,  setCommitted]  = useState(false);
  const [commits,    setCommits]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  /* ── 커밋 목록 로드 ── */
  const loadCommits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = selectedProject?.id
        ? await fetchCommitsByProject(selectedProject.id)
        : await fetchCommits();
      setCommits(data);
    } catch (e) {
      setError("커밋 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [selectedProject?.id]);

  useEffect(() => { loadCommits(); }, [loadCommits]);

  /* ── 커밋 생성 ── */
  async function handleCommit() {
    if (!summary.trim() || !selectedProject?.id) return;
    setSubmitting(true);
    try {
      const newCommit = await createCommit({
        projectId:   selectedProject.id,
        message:     summary.trim(),
        description: desc.trim(),
      });
      setCommits(prev => [newCommit, ...prev]);
      setCommitted(true);
      setSummary("");
      setDesc("");
      setTimeout(() => setCommitted(false), 2000);
    } catch {
      setError("커밋에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 헤더 */}
      <div style={{ padding: "18px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          커밋 히스토리
        </div>
        {selectedProject && (
          <div style={{ fontSize: 13, color: C.accent, marginTop: 6, fontWeight: 600, lineHeight: 1.5 }}>
            {selectedProject.name}
          </div>
        )}
      </div>

      {/* 히스토리 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 16px" }}>
        {loading ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <svg style={{ animation: "ctx-spin 0.9s linear infinite", color: C.sub }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
          </div>
        ) : error ? (
          <div style={{ padding: "20px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 12, color: "#f87171", marginBottom: 8 }}>{error}</div>
            <button
              onClick={loadCommits}
              style={{
                fontSize: 11, color: C.accent, background: "none",
                border: `1px solid ${C.inputBdr}`, borderRadius: 5,
                padding: "4px 10px", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >다시 시도</button>
          </div>
        ) : commits.length === 0 ? (
          <div style={{ padding: "40px 12px", textAlign: "center", color: C.sub, fontSize: 12 }}>
            {selectedProject ? "아직 기록된 커밋이 없습니다" : "커밋을 보려면 프로젝트를 선택해 주세요"}
          </div>
        ) : (
          commits.map((commit, idx) => (
            <CommitItem key={commit.id} commit={commit} isLatest={idx === 0} />
          ))
        )}
      </div>

      {/* 커밋 폼 */}
      <div style={{ padding: "16px 16px 20px", borderTop: `1px solid ${C.border}`, background: "rgba(0,0,0,0.015)" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          새 커밋
        </div>

        <input
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="커밋 제목"
          maxLength={80}
          style={{
            width: "100%", padding: "10px 12px",
            background: C.input, border: `1px solid ${C.inputBdr}`,
            borderRadius: 10, fontSize: 12, color: C.text,
            outline: "none", boxSizing: "border-box", marginBottom: 8, fontFamily: "inherit",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(107,105,96,0.4)"}
          onBlur={e => e.target.style.borderColor = C.inputBdr}
        />

        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="상세 설명 (선택)"
          rows={3}
          style={{
            width: "100%", padding: "10px 12px",
            background: C.input, border: `1px solid ${C.inputBdr}`,
            borderRadius: 10, fontSize: 12, color: C.text,
            outline: "none", resize: "none", boxSizing: "border-box",
            marginBottom: 10, lineHeight: "1.7", fontFamily: "inherit",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(107,105,96,0.4)"}
          onBlur={e => e.target.style.borderColor = C.inputBdr}
        />

        {error && !loading && (
          <div style={{ fontSize: 11, color: "#f87171", marginBottom: 6, textAlign: "center" }}>
            {error}
          </div>
        )}

        {!selectedProject && (
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 6, textAlign: "center" }}>
            먼저 프로젝트를 선택해 주세요
          </div>
        )}

        <button
          onClick={handleCommit}
          disabled={!summary.trim() || submitting || !selectedProject}
          style={{
            width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
            background: committed
              ? "#a8a69f"
              : !summary.trim() || submitting || !selectedProject
                ? "rgba(26,25,22,0.35)"
                : C.commit,
            color:   committed ? "#064e3b" : "var(--bg)",
            fontSize: 13, fontWeight: 700,
            cursor: !summary.trim() || submitting || !selectedProject ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "inherit",
          }}
        >
          {committed ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              커밋 완료
            </>
          ) : submitting ? "커밋 중..." : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="12" y1="2" x2="12" y2="8"/>
                <circle cx="12" cy="12" r="4"/>
                <line x1="12" y1="16" x2="12" y2="22"/>
              </svg>
              커밋 남기기
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function CommitItem({ commit, isLatest }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", gap: 4,
        padding: "12px 12px", borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.05)",
        background: hovered ? C.itemHover : "rgba(0,0,0,0.015)",
        marginBottom: 8, cursor: "default", transition: "background 0.12s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4,
          background: isLatest ? C.commit : "rgba(0,0,0,0.15)",
          border: isLatest ? "2px solid rgba(26,25,22,0.4)" : "none",
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {commit.summary}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {commit.project}
            </span>
            <span style={{ fontSize: 11, color: C.sub, flexShrink: 0 }}>{commit.time}</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, background: "rgba(0,0,0,0.04)", borderRadius: 999, padding: "4px 8px" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="1.8" strokeLinecap="round">
              <line x1="12" y1="2" x2="12" y2="8"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="16" x2="12" y2="22"/>
            </svg>
            <span style={{ fontSize: 10, color: C.sub, fontFamily: "monospace" }}>{commit.hash}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   CONTEXT PANEL (exported)
══════════════════════════════════════ */
export function ContextPanel({
  mode,
  projects,
  selectedProject,
  onSelectProject,
  selectedView,
  onSelectView,
  onCreateProject,
  onOpenWorkspaceComposer,
  onOpenWorkspaceManage,
  onOpenWorkspaceMembers,
  onDeleteProject,
  workspace,
  workspaceMembers = [],
  workspaceLoading = false,
  onOpenWorkspaceInvite,
}) {
  return (
    <div style={{
      width: 320, flexShrink: 0, height: "100vh",
      background: C.panel, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "inherit",
    }}>
      <style>{`@keyframes ctx-spin { to { transform: rotate(360deg); } }`}</style>
      {mode === "projects" ? (
        <ProjectsPanel
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
          selectedView={selectedView}
          onSelectView={onSelectView}
          onCreateProject={onCreateProject}
          onOpenWorkspaceComposer={onOpenWorkspaceComposer}
          onOpenWorkspaceManage={onOpenWorkspaceManage}
          onDeleteProject={onDeleteProject}
          workspace={workspace}
          workspaceLoading={workspaceLoading}
          onOpenWorkspaceInvite={onOpenWorkspaceInvite}
        />
      ) : mode === "workspace" ? (
        <WorkspacePanel
          workspace={workspace}
          workspaceMembers={workspaceMembers}
          workspaceLoading={workspaceLoading}
          onOpenWorkspaceComposer={onOpenWorkspaceComposer}
          onOpenWorkspaceManage={onOpenWorkspaceManage}
          onOpenWorkspaceInvite={onOpenWorkspaceInvite}
          onOpenWorkspaceMembers={onOpenWorkspaceMembers}
        />
      ) : (
        <CommitPanel selectedProject={selectedProject} />
      )}
    </div>
  );
}
