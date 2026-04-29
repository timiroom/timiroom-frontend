"use client";

/**
 * ActivityBar — 맨 왼쪽 아이콘 레일 (56px)
 * 피그마 Frame 9 기준: tab-plus 아이콘 + commit 아이콘
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

/* ── 색상 토큰 ── */
const C = {
  bar:       "#111111",
  border:    "rgba(255,255,255,0.06)",
  icon:      "#6b6b6b",
  iconHover: "#d4d4d4",
  iconActive:"#a78bfa",
  activeBg:  "rgba(139,92,246,0.14)",
  avatarBg:  "linear-gradient(135deg,#7d4cfc,#9b6dff)",
};

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

/* ── 아이콘 버튼 ── */
function ActivityIcon({ id, icon: Icon, label, isActive, onClick }) {
  const [hovered, setHovered] = useState(false);
  const active = isActive;

  return (
    <div style={{ position: "relative" }}>
      <button
        title={label}
        onClick={() => onClick(id)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width:          40,
          height:         40,
          borderRadius:   10,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          background:     active ? C.activeBg : hovered ? "rgba(255,255,255,0.06)" : "transparent",
          border:         "none",
          cursor:         "pointer",
          color:          active ? C.iconActive : hovered ? C.iconHover : C.icon,
          transition:     "all 0.15s",
          outline:        "none",
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

      {/* 툴팁 */}
      {hovered && (
        <div style={{
          position:     "absolute",
          left:         "calc(100% + 8px)",
          top:          "50%",
          transform:    "translateY(-50%)",
          background:   "#2a2a2a",
          border:       "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6,
          padding:      "4px 10px",
          fontSize:     12,
          fontWeight:   500,
          color:        "#ececec",
          whiteSpace:   "nowrap",
          zIndex:       200,
          pointerEvents:"none",
          boxShadow:    "0 4px 12px rgba(0,0,0,0.4)",
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

/* ── ActivityBar (exported) ── */
export function ActivityBar({ activeMode, onModeChange }) {
  const { user, logout } = useAuth();
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "A";

  const ICONS = [
    { id: "projects", icon: IconProjects, label: "프로젝트 목록" },
    { id: "commit",   icon: IconCommit,   label: "커밋 히스토리" },
  ];

  return (
    <div style={{
      width:          56,
      flexShrink:     0,
      height:         "100vh",
      background:     C.bar,
      borderRight:    `1px solid ${C.border}`,
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      padding:        "12px 0",
      gap:            4,
      zIndex:         50,
      position:       "relative",
    }}>
      {/* 로고 */}
      <div style={{
        width:          32,
        height:         32,
        borderRadius:   9,
        background:     "linear-gradient(135deg,#7d4cfc,#9b6dff)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        color:          "white",
        fontSize:       15,
        fontWeight:     900,
        marginBottom:   12,
        flexShrink:     0,
        letterSpacing:  "-0.03em",
      }}>
        A
      </div>

      {/* 구분선 */}
      <div style={{ width: 28, height: 1, background: C.border, marginBottom: 8 }} />

      {/* 아이콘 버튼들 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
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
            border:         avatarHovered ? "2px solid #a78bfa" : "2px solid transparent",
            cursor:         "pointer",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       12,
            fontWeight:     700,
            color:          "white",
            overflow:       "hidden",
            transition:     "border-color 0.15s",
            padding:        0,
          }}
        >
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : initials
          }
        </button>

        {/* 유저 드롭업 */}
        {showMenu && (
          <div style={{
            position:     "absolute",
            bottom:       "calc(100% + 8px)",
            left:         "calc(100% + 8px)",
            background:   "#1e1e1e",
            border:       "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            minWidth:     180,
            overflow:     "hidden",
            boxShadow:    "0 8px 32px rgba(0,0,0,0.5)",
            zIndex:       200,
          }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ececec" }}>{user?.name || "사용자"}</div>
              <div style={{ fontSize: 11, color: "#6b6b6b", marginTop: 2 }}>{user?.email}</div>
            </div>
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
    </div>
  );
}
