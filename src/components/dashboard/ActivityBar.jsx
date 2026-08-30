"use client";

/**
 * ActivityBar — 워크스페이스와 탐색을 함께 담는 단일 레일
 */

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ── 색상 토큰 ── */
const C = {
  bar:       "var(--surface)",
  border:    "rgba(0,0,0,0.06)",
  icon:      "var(--text-2)",
  iconHover: "#d4d4d4",
  iconActive:"#6b6960",
  activeBg:  "rgba(26,25,22,0.14)",
  avatarBg:  "var(--text-1)",
};

function getWorkspaceId(workspace) {
  return workspace?.teamId ?? workspace?.id ?? null;
}

function getWorkspaceInitial(workspace) {
  const source = workspace?.teamName ?? workspace?.name ?? "W";
  return source.charAt(0).toUpperCase();
}

/* ── 아이콘 SVG ── */
function IconProjects() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="9" height="9" rx="2"/>
      <rect x="13" y="3" width="9" height="9" rx="2"/>
      <rect x="2" y="14" width="9" height="9" rx="2" opacity="0.5"/>
      <rect x="13" y="14" width="9" height="9" rx="2" opacity="0.5"/>
    </svg>
  );
}

function IconCommit() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      {/* 세로 선 상단 */}
      <line x1="12" y1="2" x2="12" y2="8"/>
      {/* 커밋 원 */}
      <circle cx="12" cy="12" r="4"/>
      {/* 세로 선 하단 */}
      <line x1="12" y1="16" x2="12" y2="22"/>
    </svg>
  );
}

function IconWorkspace() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7.5c0-1.38 1.12-2.5 2.5-2.5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
      <circle cx="17" cy="14" r="2.5" />
    </svg>
  );
}

function IconAddWorkspace() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round">
      <line x1="12" y1="5.5" x2="12" y2="18.5" />
      <line x1="5.5" y1="12" x2="18.5" y2="12" />
    </svg>
  );
}

function RailTooltip({ label, rect }) {
  if (!rect) return null;

  const viewportWidth = typeof window === "undefined" ? rect.right + 220 : window.innerWidth;
  const left = Math.min(rect.right + 12, viewportWidth - 220);

  return (
    <div style={{
      position: "fixed",
      left,
      top: rect.top + (rect.height / 2),
      transform: "translateY(-50%)",
      background: "var(--bg)",
      border: "1px solid rgba(0,0,0,0.1)",
      borderRadius: 8,
      padding: "6px 10px",
      fontSize: 12,
      fontWeight: 600,
      color: "#1a1916",
      fontFamily: "inherit",
      whiteSpace: "nowrap",
      zIndex: 280,
      pointerEvents: "none",
      boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
    }}>
      {label}
    </div>
  );
}

function WorkspaceBubble({ workspace, active, onClick }) {
  const name = workspace?.teamName ?? workspace?.name ?? "워크스페이스";
  const viewerRole = workspace?.viewerRole ?? "MEMBER";
  const iconUrl = workspace?.iconUrl;
  const [tooltipRect, setTooltipRect] = useState(null);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        title={`${name}${viewerRole === "OWNER" ? " · 소유자" : ""}`}
        onClick={() => onClick(getWorkspaceId(workspace))}
        onMouseEnter={(event) => setTooltipRect(event.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setTooltipRect(null)}
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          border: active ? "1px solid rgba(26,25,22,0.24)" : "1px solid rgba(0,0,0,0.08)",
          background: iconUrl ? "none" : active ? "rgba(26,25,22,0.16)" : "var(--surface)",
          color: "var(--text-1)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 900,
          fontFamily: "inherit",
          transition: "all 0.18s",
          boxShadow: active ? "0 10px 26px rgba(0,0,0,0.18)" : "none",
          position: "relative",
          overflow: "hidden",
          padding: 0,
        }}
      >
        {iconUrl ? (
          <img src={iconUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <span style={{ position: "relative", zIndex: 1 }}>{getWorkspaceInitial(workspace)}</span>
        )}
        {viewerRole === "OWNER" && (
          <span style={{
            position: "absolute",
            right: 6,
            bottom: 6,
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#f59e0b",
            border: "2px solid var(--surface)",
          }} />
        )}
        {active && (
          <span style={{
            position: "absolute",
            left: -8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 4,
            height: 28,
            borderRadius: "0 4px 4px 0",
            background: "var(--text-1)",
          }} />
        )}
      </button>
      <RailTooltip
        label={`${name}${viewerRole === "OWNER" ? " · 소유자" : ""}`}
        rect={tooltipRect}
      />
    </div>
  );
}

function ActionBubble({ label, title, onClick, disabled = false }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipRect, setTooltipRect] = useState(null);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        title={title}
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={(event) => {
          setHovered(true);
          setTooltipRect(event.currentTarget.getBoundingClientRect());
        }}
        onMouseLeave={() => {
          setHovered(false);
          setTooltipRect(null);
        }}
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          border: "1px solid rgba(0,0,0,0.09)",
          background: hovered && !disabled ? "rgba(26,25,22,0.04)" : "var(--surface)",
          color: disabled ? "var(--text-3)" : hovered ? "var(--text-1)" : "var(--text-2)",
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "inherit",
          transition: "all 0.18s",
          opacity: disabled ? 0.55 : 1,
          boxShadow: "0 1px 0 rgba(255,255,255,0.4) inset",
        }}
      >
        {label === "+" ? <IconAddWorkspace /> : label}
      </button>
      {!disabled ? <RailTooltip label={title} rect={tooltipRect} /> : null}
    </div>
  );
}

/* ── 하단 모드 전환 버튼 ── */
function ActivityIcon({ id, icon: Icon, label, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const [tooltipRect, setTooltipRect] = useState(null);
  const active = isActive;

  return (
    <div style={{ position: "relative" }}>
      <button
        title={label}
        onClick={() => onClick(id)}
        onMouseEnter={(event) => {
          setHovered(true);
          setTooltipRect(event.currentTarget.getBoundingClientRect());
        }}
        onMouseLeave={() => {
          setHovered(false);
          setTooltipRect(null);
        }}
        style={{
          width:          40,
          height:         40,
          borderRadius:   10,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          background:     active ? C.activeBg : hovered ? "rgba(0,0,0,0.06)" : "transparent",
          border:         "none",
          cursor:         "pointer",
          color:          active ? C.iconActive : hovered ? C.iconHover : C.icon,
          transition:     "all 0.15s",
          outline:        "none",
          fontFamily:     "inherit",
        }}
      >
        <Icon />
      </button>

      {/* 활성 인디케이터 바 */}
      {active && (
        <div style={{
          position:     "absolute",
          left:         -8,
          top:          "50%",
          transform:    "translateY(-50%)",
          width:        3,
          height:       24,
          borderRadius: "0 3px 3px 0",
          background:   C.iconActive,
        }} />
      )}

      <RailTooltip label={label} rect={tooltipRect} />
    </div>
  );
}

/* ── ActivityBar (exported) ── */
export function ActivityBar({
  activeMode,
  onModeChange,
  workspaces = [],
  activeWorkspaceId,
  workspacesLoading = false,
  onSelectWorkspace,
  onCreateWorkspace,
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "A";

  const ICONS = [
    { id: "projects", icon: IconProjects, label: "프로젝트 목록" },
    { id: "workspace", icon: IconWorkspace, label: "워크스페이스 관리" },
    { id: "commit",   icon: IconCommit,   label: "커밋 히스토리" },
  ];

  return (
    <div style={{
      width:          80,
      flexShrink:     0,
      height:         "100vh",
      background:     C.bar,
      borderRight:    `1px solid ${C.border}`,
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      padding:        "12px 0",
      gap:            10,
      zIndex:         50,
      position:       "relative",
      fontFamily:     "inherit",
    }}>
      {/* 로고 */}
      <div style={{
        width:          32,
        height:         32,
        borderRadius:   9,
        background:     "var(--text-1)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        color:          "var(--bg)",
        fontSize:       15,
        fontWeight:     900,
        marginBottom:   12,
        flexShrink:     0,
        letterSpacing:  "-0.03em",
      }}>
        A
      </div>

      {/* 구분선 */}
      <div style={{ width: 34, height: 1, background: C.border }} />

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        flex: 1,
        minHeight: 0,
        width: "100%",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {ICONS.map(({ id, icon, label }) => (
            <ActivityIcon
              key={id}
              id={id}
              icon={icon}
              label={label}
              isActive={activeMode === id}
              onClick={onModeChange}
            />
          ))}
        </div>

        <div style={{ width: 34, height: 1, background: C.border }} />

        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "2px 8px 0",
          width: "100%",
        }}>
          {workspacesLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(26,25,22,0.08)",
                  animation: "activity-workspace-pulse 1.2s ease-in-out infinite",
                }}
              />
            ))
          ) : (
            workspaces.map((workspace) => {
              const workspaceId = getWorkspaceId(workspace);
              return (
                <WorkspaceBubble
                  key={workspaceId}
                  workspace={workspace}
                  active={workspaceId === activeWorkspaceId}
                  onClick={onSelectWorkspace}
                />
              );
            })
          )}

          <ActionBubble
            label="+"
            title="워크스페이스 추가 또는 참여"
            onClick={onCreateWorkspace}
          />
        </div>
      </div>

      {/* 유저 아바타 (하단) */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setShowMenu(p => !p)}
          onMouseEnter={() => setAvatarHovered(true)}
          onMouseLeave={() => setAvatarHovered(false)}
          title={user?.name || "프로필"}
          style={{
            width:          32,
            height:         32,
            borderRadius:   "50%",
            background:     user?.avatarUrl ? "none" : C.avatarBg,
            border:         avatarHovered ? "2px solid #6b6960" : "2px solid transparent",
            cursor:         "pointer",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       12,
            fontWeight:     700,
            color:          "var(--bg)",
            overflow:       "hidden",
            transition:     "border-color 0.15s",
            padding:        0,
          }}
        >
          {user?.avatarUrl
            ? <Image src={user.avatarUrl} alt="" fill sizes="32px" style={{ objectFit: "cover" }} />
            : initials
          }
        </button>

        {/* 유저 드롭업 */}
        {showMenu && (
          <div style={{
            position:     "absolute",
            bottom:       "calc(100% + 8px)",
            left:         "calc(100% + 8px)",
            background:   "var(--surface)",
            border:       "1px solid rgba(0,0,0,0.1)",
            borderRadius: 10,
            minWidth:     180,
            overflow:     "hidden",
            boxShadow:    "0 8px 32px rgba(0,0,0,0.5)",
            zIndex:       200,
          }}>
            <button
              onClick={() => { setShowMenu(false); router.push("/mypage"); }}
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        8,
                width:      "100%",
                padding:    "10px 14px",
                border:     "none",
                borderBottom: "1px solid rgba(0,0,0,0.07)",
                background: "none",
                fontSize:   13,
                color:      "var(--text-2)",
                cursor:     "pointer",
                textAlign:  "left",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              내 프로필
            </button>
            <button
              onClick={() => { setShowMenu(false); logout(); }}
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        8,
                width:      "100%",
                padding:    "10px 14px",
                border:     "none",
                background: "none",
                fontSize:   13,
                color:      "#f87171",
                cursor:     "pointer",
                textAlign:  "left",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              로그아웃
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes activity-workspace-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
