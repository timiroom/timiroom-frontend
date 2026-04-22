"use client";

/**
 * AppSidebar.jsx
 * --------------
 * Claude 레이아웃 스타일 좌측 사이드바.
 *
 * 구조:
 *   [로고 + 접기 버튼]
 *   [새 프로젝트 버튼]
 *   [프로젝트 목록 (스크롤)]
 *   [설정 + 유저 프로필]
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

/* ── CSS-in-JS 토큰 (Claude 팔레트) ── */
const C = {
  sidebar:   "#171717",
  border:    "rgba(255,255,255,0.07)",
  text:      "#ececec",
  muted:     "#8b8b8b",
  hover:     "rgba(255,255,255,0.05)",
  active:    "rgba(139,92,246,0.12)",
  activeBdr: "rgba(139,92,246,0.22)",
  accent:    "#a78bfa",
  accentDim: "rgba(139,92,246,0.18)",
};

/* ── 아이콘 SVG ── */
function IconSidebar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

/* ── 호버 가능한 항목 ── */
function SidebarItem({ icon, label, onClick, isActive, collapsed, danger }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        padding: collapsed ? "9px 0" : "8px 10px",
        background: isActive ? C.active : hovered ? C.hover : "transparent",
        border: `1px solid ${isActive ? C.activeBdr : "transparent"}`,
        borderRadius: 7,
        cursor: "pointer",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 9,
        color: danger ? (hovered ? "#f87171" : "#9ca3af") : isActive ? C.accent : hovered ? C.text : C.muted,
        fontSize: 13,
        transition: "all 0.12s",
        marginBottom: 2,
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>{icon}</span>
      {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
    </button>
  );
}

/* ══════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════ */
export function AppSidebar({ projects = [], selectedProject, onSelectProject, onCreateProject }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const W = collapsed ? 56 : 240;

  return (
    <div style={{
      width: W, minWidth: W,
      height: "100vh",
      background: C.sidebar,
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      transition: "width 0.2s ease, min-width 0.2s ease",
      overflow: "hidden",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      userSelect: "none",
    }}>

      {/* ── 헤더 ── */}
      <div style={{
        height: 52,
        padding: collapsed ? "0 12px" : "0 14px",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: "linear-gradient(135deg,#6B5CE7,#8B5CF6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 900, color: "#fff",
              boxShadow: "0 2px 8px rgba(107,92,231,0.35)",
              flexShrink: 0,
            }}>A</div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-.01em" }}>
              Align-it
            </span>
          </div>
        )}

        {/* 접기 버튼 */}
        <SidebarToggle collapsed={collapsed} onClick={() => setCollapsed(c => !c)} />
      </div>

      {/* ── 새 프로젝트 버튼 ── */}
      <div style={{ padding: collapsed ? "10px 8px" : "10px 10px", flexShrink: 0 }}>
        <NewProjectButton collapsed={collapsed} onClick={onCreateProject} />
      </div>

      {/* ── 구분선 + 라벨 ── */}
      {!collapsed && (
        <div style={{
          padding: "0 14px 6px",
          fontSize: 10, color: "#555", fontWeight: 700,
          letterSpacing: ".07em", textTransform: "uppercase",
          flexShrink: 0,
        }}>
          프로젝트
        </div>
      )}

      {/* ── 프로젝트 목록 ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: collapsed ? "0 6px" : "0 8px" }}>
        {projects.length === 0 ? (
          !collapsed && (
            <div style={{ padding: "12px 8px", fontSize: 12, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
              프로젝트가 없습니다.<br/>새 프로젝트를 만들어보세요.
            </div>
          )
        ) : (
          projects.map(p => (
            <ProjectItem
              key={p.id}
              project={p}
              isSelected={selectedProject?.id === p.id}
              collapsed={collapsed}
              onClick={() => onSelectProject(p)}
            />
          ))
        )}
      </div>

      {/* ── 하단 영역 ── */}
      <div style={{
        borderTop: `1px solid ${C.border}`,
        padding: collapsed ? "8px 6px" : "8px 8px",
        flexShrink: 0,
      }}>
        <SidebarItem
          icon={<IconSettings />}
          label="설정"
          onClick={() => {}}
          collapsed={collapsed}
        />
        {user && (
          <UserProfile user={user} collapsed={collapsed} onLogout={logout} />
        )}
      </div>
    </div>
  );
}

/* ── 서브 컴포넌트들 ── */

function SidebarToggle({ collapsed, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? "사이드바 열기" : "사이드바 닫기"}
      style={{
        background: hovered ? C.hover : "transparent",
        border: "none", cursor: "pointer",
        color: hovered ? C.text : C.muted,
        borderRadius: 6, padding: 5,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.12s", flexShrink: 0,
      }}
    >
      <IconSidebar />
    </button>
  );
}

function NewProjectButton({ collapsed, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? "새 프로젝트" : undefined}
      style={{
        width: "100%",
        padding: collapsed ? "9px 0" : "8px 12px",
        background: hovered ? C.accentDim : "rgba(139,92,246,0.08)",
        border: `1px solid ${hovered ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.18)"}`,
        borderRadius: 8, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 8,
        color: C.accent, fontSize: 13, fontWeight: 600,
        justifyContent: collapsed ? "center" : "flex-start",
        transition: "all 0.15s",
        fontFamily: "inherit",
      }}
    >
      <IconPlus />
      {!collapsed && <span>새 프로젝트</span>}
    </button>
  );
}

function ProjectItem({ project, isSelected, collapsed, onClick }) {
  const [hovered, setHovered] = useState(false);
  const initial = (project.name || "P").charAt(0).toUpperCase();
  const color   = project.color || "#7C3AED";

  return (
    <button
      onClick={onClick}
      title={collapsed ? project.name : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        padding: collapsed ? "8px 0" : "7px 10px",
        background: isSelected ? C.active : hovered ? C.hover : "transparent",
        border: `1px solid ${isSelected ? C.activeBdr : "transparent"}`,
        borderRadius: 7, cursor: "pointer",
        display: "flex", alignItems: "center",
        justifyContent: collapsed ? "center" : "flex-start",
        gap: 9,
        color: isSelected ? C.accent : hovered ? C.text : "#9ca3af",
        fontSize: 13,
        transition: "all 0.12s", marginBottom: 1,
        textAlign: "left", fontFamily: "inherit",
      }}
    >
      {/* 아바타 */}
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: `${color}22`,
        border: `1px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 900, color: color,
        flexShrink: 0,
      }}>
        {initial}
      </div>
      {!collapsed && (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {project.name}
        </span>
      )}
    </button>
  );
}

function UserProfile({ user, collapsed, onLogout }) {
  const [open, setOpen] = useState(false);
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={collapsed ? (user.name || user.email) : undefined}
        style={{
          width: "100%",
          padding: collapsed ? "8px 0" : "8px 10px",
          background: open ? C.hover : "transparent",
          border: "1px solid transparent",
          borderRadius: 7, cursor: "pointer",
          display: "flex", alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 9, color: C.muted,
          transition: "all 0.12s", fontFamily: "inherit",
        }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: "50%",
          background: "linear-gradient(135deg,#6B5CE7,#8B5CF6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
        }}>
          {initial}
        </div>
        {!collapsed && (
          <span style={{
            fontSize: 12, color: "#9ca3af",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {user.name || user.email}
          </span>
        )}
      </button>

      {/* 드롭업 */}
      {open && !collapsed && (
        <div style={{
          position: "absolute", bottom: "100%", left: 0, right: 0,
          background: "#222", border: `1px solid ${C.border}`,
          borderRadius: 8, overflow: "hidden",
          marginBottom: 4, boxShadow: "0 -4px 16px rgba(0,0,0,0.4)",
        }}>
          <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{user.name || "사용자"}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{user.email}</div>
          </div>
          <button
            onClick={() => { setOpen(false); onLogout?.(); }}
            style={{
              width: "100%", padding: "9px 12px", background: "transparent", border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              color: "#f87171", fontSize: 12, fontFamily: "inherit",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <IconLogout /> 로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
