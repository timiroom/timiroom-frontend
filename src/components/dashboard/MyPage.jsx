"use client";

/**
 * MyPage.jsx
 * ----------
 * 사용자 프로필 및 계정 설정 페이지.
 * 백엔드 연동 전까지 프로필 정보는 AuthContext에서,
 * 팀/활동 데이터는 Mock으로 표시.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/* ── Mock 데이터 (TODO: 백엔드 연동 시 API로 교체) ── */
const MOCK_TEAMS = [
  { id: 1, name: "내 팀", memberCount: 1, projectCount: 2, role: "owner" },
];

const MOCK_STATS = {
  projectCount: 2,
  specCount: 14,
  joinedAt: "2025-01-15",
};

/* ── 섹션 카드 래퍼 ── */
function Card({ children, style }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--db-radius-lg)",
      padding: "24px 28px",
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ── 섹션 타이틀 ── */
function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      color: "var(--text-3)",
      letterSpacing: ".07em",
      textTransform: "uppercase",
      marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

/* ── 아바타 원 ── */
function Avatar({ user, size = 72 }) {
  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt="profile"
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover",
          border: "3px solid var(--border)",
        }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--text-1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 800, color: "var(--bg)",
      border: "3px solid var(--border)",
      flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

/* ── 뒤로가기 버튼 ── */
function BackButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "none", border: "none", cursor: "pointer",
        color: hovered ? "var(--text-1)" : "var(--text-3)",
        fontSize: 13, fontWeight: 600,
        padding: "6px 0",
        transition: "color 0.15s",
        marginBottom: 28,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      대시보드로 돌아가기
    </button>
  );
}

/* ══════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════ */
export function MyPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  /* 이름 편집 상태 */
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState(user?.name || "");
  const [savedName, setSavedName]     = useState(user?.name || "");

  function handleSaveName() {
    if (nameInput.trim()) {
      setSavedName(nameInput.trim());
      // TODO: PATCH /auth/me API 연동
    }
    setEditingName(false);
  }

  function handleCancelEdit() {
    setNameInput(savedName);
    setEditingName(false);
  }

  /* 로그아웃 확인 */
  const [confirmLogout, setConfirmLogout] = useState(false);

  const displayName = savedName || user?.name || "사용자";
  const email       = user?.email || "";
  const provider    = email.includes("gmail") ? "Google" : "GitHub";

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      overflowY: "auto",
    }}>
      {/* 배경 orb */}
      <div style={{
        position: "fixed", top: "-5%", right: "10%",
        width: 400, height: 400, borderRadius: "50%",
        background: "rgba(124,58,237,0.06)", filter: "blur(80px)",
        pointerEvents: "none",
      }}/>

      <div style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "48px 24px 80px",
        position: "relative",
      }}>

        {/* ── 뒤로가기 ── */}
        <BackButton onClick={() => router.push("/dashboard")} />

        {/* ── 페이지 제목 ── */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 28, fontWeight: 900,
            color: "var(--text-1)", letterSpacing: "-.03em",
            margin: 0, marginBottom: 6,
          }}>
            내 프로필
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", margin: 0 }}>
            계정 정보와 설정을 관리하세요
          </p>
        </div>

        {/* ─────────────────────────────────────
            1. 프로필 카드
        ───────────────────────────────────── */}
        <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 24 }}>
          <Avatar user={user} size={72} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", marginBottom: 4, letterSpacing: "-.02em" }}>
              {displayName}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 10 }}>
              {email}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* OAuth provider 뱃지 */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 600,
                padding: "3px 10px", borderRadius: 100,
                background: "var(--border)", color: "var(--text-2)",
                border: "1px solid var(--border-2)",
              }}>
                {provider === "Google" ? "🔵" : "⚫"} {provider}으로 로그인
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 600,
                padding: "3px 10px", borderRadius: 100,
                background: "rgba(16,185,129,0.1)", color: "#10B981",
                border: "1px solid rgba(16,185,129,0.2)",
              }}>
                ● 활성
              </span>
            </div>
          </div>
        </Card>

        {/* ─────────────────────────────────────
            2. 계정 정보
        ───────────────────────────────────── */}
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>계정 정보</SectionTitle>

          {/* 이름 */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 8 }}>
              이름
            </label>
            {editingName ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") handleCancelEdit(); }}
                  autoFocus
                  style={{
                    flex: 1,
                    padding: "9px 13px",
                    borderRadius: "var(--db-radius-sm)",
                    border: "1.5px solid var(--text-2)",
                    background: "var(--surface)",
                    color: "var(--text-1)", fontSize: 14,
                    outline: "none", fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={handleSaveName}
                  style={{
                    padding: "9px 18px", borderRadius: "var(--db-radius-sm)",
                    background: "var(--text-1)", color: "var(--bg)",
                    border: "none", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    padding: "9px 14px", borderRadius: "var(--db-radius-sm)",
                    background: "var(--border)", color: "var(--text-2)",
                    border: "1px solid var(--border-2)", fontSize: 13,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  취소
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "var(--text-1)", padding: "9px 0" }}>
                  {displayName}
                </span>
                <button
                  onClick={() => { setNameInput(displayName); setEditingName(true); }}
                  style={{
                    padding: "6px 14px", borderRadius: "var(--db-radius-sm)",
                    background: "var(--border)", color: "var(--text-2)",
                    border: "1px solid var(--border-2)", fontSize: 12,
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text-2)"; e.currentTarget.style.color = "var(--text-1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.color = "var(--text-2)"; }}
                >
                  수정
                </button>
              </div>
            )}
          </div>

          {/* 이메일 */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 8 }}>
              이메일
            </label>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "var(--text-1)", padding: "9px 0" }}>
                {email || "—"}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 9px",
                borderRadius: 100, background: "var(--border)", color: "var(--text-3)",
              }}>
                OAuth 연동
              </span>
            </div>
          </div>
        </Card>

        {/* ─────────────────────────────────────
            3. 활동 요약
        ───────────────────────────────────── */}
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>활동 요약</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "참여 프로젝트", value: MOCK_STATS.projectCount, icon: "📁" },
              { label: "생성된 명세서", value: MOCK_STATS.specCount,    icon: "📄" },
              { label: "소속 팀",       value: MOCK_TEAMS.length,        icon: "👥" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--db-radius)",
                padding: "18px 20px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{stat.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text-1)", letterSpacing: "-.03em" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ─────────────────────────────────────
            4. 내 팀
        ───────────────────────────────────── */}
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>내 팀</SectionTitle>
          {MOCK_TEAMS.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "28px 0",
              color: "var(--text-3)", fontSize: 13,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
              소속된 팀이 없습니다
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {MOCK_TEAMS.map(team => (
                <div key={team.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 16px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--db-radius)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "var(--text-1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, color: "var(--bg)",
                    }}>
                      {team.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>
                        {team.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                        멤버 {team.memberCount}명 · 프로젝트 {team.projectCount}개
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 100,
                    background: team.role === "owner"
                      ? "rgba(26,25,22,0.1)"
                      : "rgba(59,130,246,0.1)",
                    color: team.role === "owner"
                      ? "var(--text-1)"
                      : "#3B82F6",
                  }}>
                    {team.role === "owner" ? "오너" : "멤버"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ─────────────────────────────────────
            5. 위험 구역
        ───────────────────────────────────── */}
        <Card style={{ borderColor: "rgba(239,68,68,0.2)" }}>
          <SectionTitle>계정 관리</SectionTitle>

          {!confirmLogout ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 3 }}>로그아웃</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>현재 세션에서 로그아웃합니다</div>
              </div>
              <button
                onClick={() => setConfirmLogout(true)}
                style={{
                  padding: "9px 20px", borderRadius: "var(--db-radius-sm)",
                  background: "transparent", color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.35)",
                  fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px",
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "var(--db-radius-sm)",
            }}>
              <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 600 }}>
                정말 로그아웃하시겠어요?
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setConfirmLogout(false)}
                  style={{
                    padding: "7px 16px", borderRadius: "var(--db-radius-sm)",
                    background: "var(--border)", color: "var(--text-2)",
                    border: "1px solid var(--border-2)", fontSize: 13,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  취소
                </button>
                <button
                  onClick={logout}
                  style={{
                    padding: "7px 16px", borderRadius: "var(--db-radius-sm)",
                    background: "#ef4444", color: "white",
                    border: "none", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
