"use client";

/**
 * ContextPanel — 두 번째 패널 (260px)
 *
 * mode = 'projects'
 *   프로젝트 목록 + 아코디언 서브 문서 트리
 *   프로젝트 클릭 → 펼치기/접기
 *   서브 아이템 클릭 → 해당 문서 뷰 선택
 *
 * mode = 'commit'
 *   커밋 히스토리 + 커밋 폼
 */

import { useState } from "react";

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
};

/* ── 프로젝트 서브 문서 목록 ── */
const PROJECT_DOCS = [
  { id: "prd",      label: "PRD",       icon: "✏️" },
  { id: "features", label: "기능 명세서", icon: "⚡" },
  { id: "api",      label: "API 명세서",  icon: "🔗" },
  { id: "erd",      label: "ERD 명세서",  icon: "🗄️" },
  { id: "qa",       label: "QA",         icon: "✓"  },
];

/* ── 샘플 커밋 히스토리 ── */
const MOCK_COMMITS = [
  { id: "c001", summary: "초기 PRD 및 기능 목록 확정",  project: "Align-it MVP",   time: "1시간 전", hash: "3a4b5c" },
  { id: "c002", summary: "API 명세 v1 생성",            project: "Align-it MVP",   time: "3시간 전", hash: "8f2e1a" },
  { id: "c003", summary: "DB 스키마 1차 설계",           project: "Align-it MVP",   time: "어제",     hash: "c9d3b7" },
  { id: "c004", summary: "QA 시나리오 자동 생성",        project: "테스트 프로젝트", time: "2일 전",   hash: "e1f4a2" },
];

/* ══════════════════════════════════════
   PROJECTS PANEL
══════════════════════════════════════ */
function ProjectsPanel({ projects, selectedProject, onSelectProject, selectedView, onSelectView }) {
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
      <div style={{ padding: "14px 14px 10px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: C.muted,
          letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 10,
        }}>
          프로젝트
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
              width: "100%", padding: "7px 10px 7px 28px",
              background: C.input, border: `1px solid ${C.inputBdr}`,
              borderRadius: 8, fontSize: 12, color: C.text,
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* 트리 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 6px" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "32px 12px", textAlign: "center", color: C.sub, fontSize: 13 }}>
            {search ? "검색 결과 없음" : "프로젝트가 없습니다"}
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

/* ── 프로젝트 헤더 행 ── */
function ProjectRow({ project, status, isSelected, isOpen, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:       "flex",
        alignItems:    "center",
        gap:           6,
        width:         "100%",
        padding:       "8px 8px",
        borderRadius:  7,
        border:        isSelected ? `1px solid ${C.activeBdr}` : "1px solid transparent",
        background:    isSelected ? C.active : hovered ? C.hover : "transparent",
        cursor:        "pointer",
        textAlign:     "left",
        transition:    "all 0.12s",
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
        flex: 1, fontSize: 13, fontWeight: 600,
        color: isSelected ? C.accent : C.text,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {project.name}
      </span>

      {/* 상태 배지 */}
      <span style={{
        fontSize: 10, fontWeight: 600, color: status.color,
        background: `${status.color}18`, padding: "2px 6px",
        borderRadius: 100, whiteSpace: "nowrap", flexShrink: 0,
      }}>
        {status.label}
      </span>
    </button>
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
        padding:      "6px 8px 6px 18px",
        borderRadius: 6,
        border:       isActive ? `1px solid ${C.activeBdr}` : "1px solid transparent",
        background:   isActive ? C.accentDim : hovered ? C.hover : "transparent",
        cursor:       "pointer",
        textAlign:    "left",
        transition:   "all 0.1s",
        marginBottom: 1,
      }}
    >
      {/* 들여쓰기 연결선 */}
      <div style={{
        width:       1,
        height:      16,
        background:  isActive ? C.accent : C.sub,
        flexShrink:  0,
        marginLeft:  -10,
        marginRight: 3,
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

  async function handleCommit() {
    if (!summary.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setCommitted(true);
    setSummary("");
    setDesc("");
    setTimeout(() => setCommitted(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 헤더 */}
      <div style={{ padding: "14px 14px 12px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          커밋 히스토리
        </div>
        {selectedProject && (
          <div style={{ fontSize: 12, color: C.accent, marginTop: 4, fontWeight: 500 }}>
            {selectedProject.name}
          </div>
        )}
      </div>

      {/* 히스토리 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        {MOCK_COMMITS.map((commit, idx) => (
          <CommitItem key={commit.id} commit={commit} isLatest={idx === 0} />
        ))}
      </div>

      {/* 커밋 폼 */}
      <div style={{ padding: "12px 12px 16px", borderTop: `1px solid ${C.border}`, background: C.panel }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          새 커밋
        </div>

        <input
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="Summary"
          maxLength={80}
          style={{
            width: "100%", padding: "8px 10px",
            background: C.input, border: `1px solid ${C.inputBdr}`,
            borderRadius: 6, fontSize: 12, color: C.text,
            outline: "none", boxSizing: "border-box", marginBottom: 6,
          }}
          onFocus={e => e.target.style.borderColor = "rgba(107,105,96,0.4)"}
          onBlur={e => e.target.style.borderColor = C.inputBdr}
        />

        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Description (선택사항)"
          rows={3}
          style={{
            width: "100%", padding: "8px 10px",
            background: C.input, border: `1px solid ${C.inputBdr}`,
            borderRadius: 6, fontSize: 12, color: C.text,
            outline: "none", resize: "none", boxSizing: "border-box",
            marginBottom: 8, lineHeight: "1.6", fontFamily: "inherit",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(107,105,96,0.4)"}
          onBlur={e => e.target.style.borderColor = C.inputBdr}
        />

        <button
          onClick={handleCommit}
          disabled={!summary.trim() || submitting}
          style={{
            width: "100%", padding: "9px 0", borderRadius: 6, border: "none",
            background: committed
              ? "#a8a69f"
              : !summary.trim() || submitting ? "rgba(26,25,22,0.35)" : C.commit,
            color:      committed ? "#064e3b" : "var(--bg)",
            fontSize: 13, fontWeight: 700,
            cursor: !summary.trim() || submitting ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
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
              Commit
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
        padding: "10px 10px", borderRadius: 8,
        background: hovered ? C.itemHover : "transparent",
        marginBottom: 2, cursor: "default", transition: "background 0.12s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 4,
          background: isLatest ? C.commit : "rgba(0,0,0,0.15)",
          border: isLatest ? "2px solid rgba(26,25,22,0.4)" : "none",
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {commit.summary}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <span style={{ fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
              {commit.project}
            </span>
            <span style={{ fontSize: 10, color: C.sub, flexShrink: 0 }}>{commit.time}</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, background: "rgba(0,0,0,0.04)", borderRadius: 4, padding: "2px 7px" }}>
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
export function ContextPanel({ mode, projects, selectedProject, onSelectProject, selectedView, onSelectView }) {
  return (
    <div style={{
      width: 260, flexShrink: 0, height: "100vh",
      background: C.panel, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {mode === "projects" ? (
        <ProjectsPanel
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={onSelectProject}
          selectedView={selectedView}
          onSelectView={onSelectView}
        />
      ) : (
        <CommitPanel selectedProject={selectedProject} />
      )}
    </div>
  );
}
