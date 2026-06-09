"use client";

/**
 * MyPage.jsx
 * ----------
 * 사용자 프로필 및 계정 설정 페이지.
 * - 프로젝트 목록: fetchProjects() (projectApi)
 * - 팀 목록:       getMyTeams()    (teamApi)
 * - 로그아웃:      logout()        (AuthContext → POST /auth/logout)
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchProjects } from "@/lib/projectApi";
import { getMyTeams } from "@/lib/teamApi";

/* ── 프로젝트 상태 메타 ── */
const STATUS_META = {
  active:    { label: "진행 중", color: "#6b55dc", bg: "rgba(107,85,220,0.1)" },
  running:   { label: "생성 중", color: "#6b55dc", bg: "rgba(107,85,220,0.1)" },
  draft:     { label: "초안",    color: "#a8a69f", bg: "rgba(168,166,159,0.12)" },
  completed: { label: "완료",    color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
  paused:    { label: "정지",    color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  archived:  { label: "보관",    color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
};

/* ── 공통 카드 ── */
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
      fontSize: 11, fontWeight: 700, color: "var(--text-3)",
      letterSpacing: ".07em", textTransform: "uppercase",
      marginBottom: 16,
    }}>
      {children}
    </div>
  );
}

/* ── 로딩 스피너 ── */
function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "28px 0" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2"
        style={{ animation: "mp-spin 0.9s linear infinite" }}>
        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

/* ── 아바타 ── */
function Avatar({ user, size = 72 }) {
  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  if (user?.avatarUrl) {
    return (
      <Image src={user.avatarUrl} alt="profile" width={size} height={size}
        style={{ borderRadius: "50%", objectFit: "cover", border: "3px solid var(--border)" }}
        unoptimized />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--text-1)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 800, color: "var(--bg)",
      border: "3px solid var(--border)", flexShrink: 0,
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
        fontSize: 13, fontWeight: 600, padding: "6px 0",
        transition: "color 0.15s", marginBottom: 28,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      대시보드로 돌아가기
    </button>
  );
}

/* ── 프로젝트 행 ── */
function ProjectRow({ project, onClick }) {
  const [hovered, setHovered] = useState(false);
  const meta = STATUS_META[project.status] ?? STATUS_META.draft;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 16px",
        background: hovered ? "var(--bg)" : "transparent",
        border: `1px solid ${hovered ? "var(--border-2)" : "var(--border)"}`,
        borderRadius: "var(--db-radius)",
        cursor: "pointer", transition: "all 0.15s",
        marginBottom: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {/* 컬러 도트 */}
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: project.color ?? meta.color,
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: "var(--text-1)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {project.name}
          </div>
          {project.description && (
            <div style={{
              fontSize: 11, color: "var(--text-3)", marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {project.description}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
          background: meta.bg, color: meta.color,
        }}>
          {meta.label}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════ */
export function MyPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  /* ── 데이터 로딩 ── */
  const [projects,  setProjects]  = useState([]);
  const [teams,     setTeams]     = useState([]);
  const [loadingP,  setLoadingP]  = useState(true);
  const [loadingT,  setLoadingT]  = useState(true);

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoadingP(false));

    getMyTeams()
      .then(data => setTeams(Array.isArray(data) ? data : []))
      .catch(() => setTeams([]))
      .finally(() => setLoadingT(false));
  }, []);

  /* ── 이름 편집 ── */
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState(user?.name || "");
  const [savedName,   setSavedName]   = useState(user?.name || "");

  function handleSaveName() {
    if (nameInput.trim()) {
      setSavedName(nameInput.trim());
      // TODO: PATCH /auth/me 연동
    }
    setEditingName(false);
  }

  /* ── 로그아웃 확인 ── */
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut,    setLoggingOut]    = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout(); // AuthContext → POST /auth/logout → window.location.href = "/"
  }

  const displayName = savedName || user?.name || "사용자";
  const email       = user?.email || "";
  const provider    = email.toLowerCase().includes("gmail") || email.toLowerCase().includes("google")
    ? "Google" : "GitHub";

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

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px", position: "relative" }}>

        <BackButton onClick={() => router.push("/dashboard")} />

        {/* 페이지 제목 */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--text-1)", letterSpacing: "-.03em", margin: 0, marginBottom: 6 }}>
            내 프로필
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-3)", margin: 0 }}>
            계정 정보와 설정을 관리하세요
          </p>
        </div>

        {/* ── 1. 프로필 카드 ── */}
        <Card style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 24 }}>
          <Avatar user={user} size={72} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-1)", marginBottom: 4, letterSpacing: "-.02em" }}>
              {displayName}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 10 }}>{email}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
                background: "var(--border)", color: "var(--text-2)", border: "1px solid var(--border-2)",
              }}>
                {provider === "Google" ? "🔵" : "⚫"} {provider}으로 로그인
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100,
                background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)",
              }}>
                ● 활성
              </span>
            </div>
          </div>
        </Card>

        {/* ── 2. 계정 정보 ── */}
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>계정 정보</SectionTitle>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 8 }}>이름</label>
            {editingName ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") { setNameInput(savedName); setEditingName(false); } }}
                  autoFocus
                  style={{
                    flex: 1, padding: "9px 13px", borderRadius: "var(--db-radius-sm)",
                    border: "1.5px solid var(--text-2)", background: "var(--surface)",
                    color: "var(--text-1)", fontSize: 14, outline: "none", fontFamily: "inherit",
                  }}
                />
                <button onClick={handleSaveName} style={{ padding: "9px 18px", borderRadius: "var(--db-radius-sm)", background: "var(--text-1)", color: "var(--bg)", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>저장</button>
                <button onClick={() => { setNameInput(savedName); setEditingName(false); }} style={{ padding: "9px 14px", borderRadius: "var(--db-radius-sm)", background: "var(--border)", color: "var(--text-2)", border: "1px solid var(--border-2)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>취소</button>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "var(--text-1)", padding: "9px 0" }}>{displayName}</span>
                <button
                  onClick={() => { setNameInput(displayName); setEditingName(true); }}
                  style={{ padding: "6px 14px", borderRadius: "var(--db-radius-sm)", background: "var(--border)", color: "var(--text-2)", border: "1px solid var(--border-2)", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text-2)"; e.currentTarget.style.color = "var(--text-1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.color = "var(--text-2)"; }}
                >수정</button>
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 8 }}>이메일</label>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, color: "var(--text-1)", padding: "9px 0" }}>{email || "—"}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: "var(--border)", color: "var(--text-3)" }}>OAuth 연동</span>
            </div>
          </div>
        </Card>

        {/* ── 3. 활동 요약 ── */}
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>활동 요약</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "내 프로젝트",  value: loadingP ? "—" : projects.length,           icon: "📁" },
              { label: "생성된 명세서", value: loadingP ? "—" : projects.reduce((a, p) => a + (p.specCount || 0), 0), icon: "📄" },
              { label: "소속 팀",       value: loadingT ? "—" : teams.length,              icon: "👥" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: "var(--db-radius)", padding: "18px 20px", textAlign: "center",
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

        {/* ── 4. 내 프로젝트 ── */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SectionTitle style={{ margin: 0 }}>내 프로젝트</SectionTitle>
            <button
              onClick={() => router.push("/dashboard")}
              style={{
                fontSize: 12, color: "var(--text-3)", background: "none",
                border: "none", cursor: "pointer", padding: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
            >
              전체 보기 →
            </button>
          </div>
          {loadingP ? (
            <Spinner />
          ) : projects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-3)", fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
              아직 생성된 프로젝트가 없습니다
            </div>
          ) : (
            <>
              {projects.slice(0, 5).map(project => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onClick={() => router.push("/dashboard")}
                />
              ))}
              {projects.length > 5 && (
                <div style={{ textAlign: "center", paddingTop: 8 }}>
                  <button
                    onClick={() => router.push("/dashboard")}
                    style={{
                      fontSize: 12, color: "var(--text-3)", background: "none",
                      border: "none", cursor: "pointer",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--text-1)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
                  >
                    + {projects.length - 5}개 더 보기
                  </button>
                </div>
              )}
            </>
          )}
        </Card>

        {/* ── 5. 내 팀 ── */}
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>내 팀</SectionTitle>
          {loadingT ? (
            <Spinner />
          ) : teams.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-3)", fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
              소속된 팀이 없습니다
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {teams.map((team, i) => (
                <div key={team.teamId ?? team.id ?? i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 16px",
                  background: "var(--bg)", border: "1px solid var(--border)",
                  borderRadius: "var(--db-radius)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: "var(--text-1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 800, color: "var(--bg)",
                    }}>
                      {(team.teamName ?? team.name ?? "T").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>
                        {team.teamName ?? team.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                        {team.memberCount != null ? `멤버 ${team.memberCount}명` : ""}
                        {team.projectCount != null ? ` · 프로젝트 ${team.projectCount}개` : ""}
                      </div>
                    </div>
                  </div>
                  {team.role && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100,
                      background: team.role === "owner" ? "rgba(26,25,22,0.1)" : "rgba(59,130,246,0.1)",
                      color: team.role === "owner" ? "var(--text-1)" : "#3B82F6",
                    }}>
                      {team.role === "owner" ? "오너" : "멤버"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── 6. 계정 관리 (로그아웃) ── */}
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
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
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
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "var(--db-radius-sm)",
            }}>
              <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 600 }}>
                정말 로그아웃하시겠어요?
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setConfirmLogout(false)}
                  disabled={loggingOut}
                  style={{
                    padding: "7px 16px", borderRadius: "var(--db-radius-sm)",
                    background: "var(--border)", color: "var(--text-2)",
                    border: "1px solid var(--border-2)", fontSize: 13,
                    cursor: loggingOut ? "not-allowed" : "pointer", fontFamily: "inherit",
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  style={{
                    padding: "7px 20px", borderRadius: "var(--db-radius-sm)",
                    background: loggingOut ? "rgba(239,68,68,0.5)" : "#ef4444",
                    color: "white", border: "none", fontSize: 13, fontWeight: 600,
                    cursor: loggingOut ? "not-allowed" : "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                  }}
                >
                  {loggingOut ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                        style={{ animation: "mp-spin 0.9s linear infinite" }}>
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                      </svg>
                      로그아웃 중...
                    </>
                  ) : "로그아웃"}
                </button>
              </div>
            </div>
          )}
        </Card>

      </div>

      <style>{`
        @keyframes mp-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
