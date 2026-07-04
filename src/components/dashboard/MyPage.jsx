"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchProjects } from "@/lib/projectApi";
import { getMyTeams, uploadUserAvatar, updateMemberName } from "@/lib/teamApi";
import { TeamWorkspacePanel } from "@/components/dashboard/mypage/TeamWorkspacePanel";

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
function Spinner({ size = 20, color = "var(--text-3)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
      style={{ animation: "mp-spin 0.9s linear infinite", display: "block" }}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
    </svg>
  );
}

/* ── 아바타 (클릭해서 업로드) ── */
function AvatarUpload({ user, size = 72, uploading, onClick }) {
  const [hovered, setHovered] = useState(false);
  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="프로필 사진 변경"
      style={{
        position: "relative", width: size, height: size,
        borderRadius: "50%", border: "none", padding: 0,
        cursor: uploading ? "wait" : "pointer",
        flexShrink: 0, background: "none",
        outline: "none",
      }}
    >
      {/* 이미지 or 이니셜 */}
      {user?.avatarUrl ? (
        <Image src={user.avatarUrl} alt="profile" width={size} height={size}
          style={{ borderRadius: "50%", objectFit: "cover", border: "3px solid var(--border)", display: "block" }}
          unoptimized />
      ) : (
        <div style={{
          width: size, height: size, borderRadius: "50%",
          background: "var(--text-1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: size * 0.4, fontWeight: 800, color: "var(--bg)",
          border: "3px solid var(--border)",
        }}>
          {initial}
        </div>
      )}

      {/* 호버 / 업로드 중 오버레이 */}
      {(hovered || uploading) && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "rgba(0,0,0,0.45)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 3,
        }}>
          {uploading ? (
            <Spinner size={18} color="white" />
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span style={{ fontSize: 9, fontWeight: 700, color: "white", letterSpacing: ".03em" }}>변경</span>
            </>
          )}
        </div>
      )}
    </button>
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

/* ══════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════ */
export function MyPage() {
  const { user, logout, refreshUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const avatarInputRef = useRef(null);

  /* ── 데이터 로딩 ── */
  const [projects,  setProjects]  = useState([]);
  const [teams,     setTeams]     = useState([]);
  const [loadingP,  setLoadingP]  = useState(true);
  const [loadingT,  setLoadingT]  = useState(true);

  const refreshTeams = useCallback(async () => {
    setLoadingT(true);
    try {
      const data = await getMyTeams();
      setTeams(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
    } catch {
      setTeams([]);
      return [];
    } finally {
      setLoadingT(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setProjects([]);
      setTeams([]);
      setLoadingP(false);
      setLoadingT(false);
      router.replace("/");
      return;
    }

    setLoadingP(true);
    setLoadingT(true);
    fetchProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoadingP(false));

    refreshTeams();
  }, [authLoading, user, refreshTeams, router]);

  /* ── 아바타 업로드 ── */
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFeedback,  setAvatarFeedback]  = useState(null);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarFeedback(null);
    try {
      await uploadUserAvatar(file);
      await refreshUser();
      setAvatarFeedback({ type: "success", message: "프로필 사진을 저장했어요." });
    } catch (err) {
      setAvatarFeedback({ type: "error", message: err instanceof Error ? err.message : "업로드에 실패했습니다." });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  /* ── 이름 편집 ── */
  const [editingName, setEditingName]   = useState(false);
  const [nameInput,   setNameInput]     = useState("");
  const [savingName,  setSavingName]    = useState(false);
  const [nameFeedback, setNameFeedback] = useState(null);

  useEffect(() => {
    if (user?.name) setNameInput(user.name);
  }, [user?.name]);

  async function handleSaveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    setNameFeedback(null);
    try {
      await updateMemberName(trimmed);
      await refreshUser();
      setNameFeedback({ type: "success", message: "이름을 저장했어요." });
      setEditingName(false);
    } catch (err) {
      setNameFeedback({ type: "error", message: err instanceof Error ? err.message : "이름 저장에 실패했습니다." });
    } finally {
      setSavingName(false);
    }
  }

  /* ── 로그아웃 확인 ── */
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut,    setLoggingOut]    = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  const displayName = user?.name || "사용자";
  const email       = user?.email || "";
  const provider    = email.toLowerCase().includes("gmail") || email.toLowerCase().includes("google")
    ? "Google" : "GitHub";
  const accountRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "14px 0",
    borderBottom: "1px solid var(--border)",
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg)", color: "var(--text-3)", fontSize: 13,
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      }}>
        로그인 상태를 확인하는 중...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      overflowY: "auto",
    }}>
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
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <AvatarUpload
              user={user}
              size={72}
              uploading={uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
            {avatarFeedback && (
              <span style={{
                fontSize: 10, fontWeight: 600, whiteSpace: "nowrap",
                color: avatarFeedback.type === "success" ? "#10B981" : "#ef4444",
              }}>
                {avatarFeedback.message}
              </span>
            )}
          </div>

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
          <div>
            <div style={accountRowStyle}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>이름</div>
                {editingName ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") { setNameInput(user?.name || ""); setEditingName(false); setNameFeedback(null); }
                      }}
                      disabled={savingName}
                      autoFocus
                      style={{
                        flex: "1 1 220px", minWidth: 0,
                        padding: "9px 13px", borderRadius: "var(--db-radius-sm)",
                        border: "1px solid var(--border-2)", background: "transparent",
                        color: "var(--text-1)", fontSize: 14, outline: "none", fontFamily: "inherit",
                        opacity: savingName ? 0.6 : 1,
                      }}
                    />
                    <button
                      onClick={handleSaveName}
                      disabled={savingName}
                      style={{
                        padding: "9px 18px", borderRadius: "var(--db-radius-sm)",
                        background: "var(--text-1)", color: "var(--bg)", border: "none",
                        fontSize: 13, fontWeight: 600, cursor: savingName ? "wait" : "pointer",
                        fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      {savingName ? <Spinner size={13} color="var(--bg)" /> : null}
                      저장
                    </button>
                    <button
                      onClick={() => { setNameInput(user?.name || ""); setEditingName(false); setNameFeedback(null); }}
                      disabled={savingName}
                      style={{
                        padding: "9px 14px", borderRadius: "var(--db-radius-sm)",
                        background: "var(--surface)", color: "var(--text-2)",
                        border: "1px solid var(--border-2)", fontSize: 13,
                        cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.6 }}>
                    {displayName}
                  </div>
                )}
                {nameFeedback && !editingName && (
                  <div style={{
                    fontSize: 11, marginTop: 6, fontWeight: 600,
                    color: nameFeedback.type === "success" ? "#10B981" : "#ef4444",
                  }}>
                    {nameFeedback.message}
                  </div>
                )}
              </div>
              {!editingName && (
                <button
                  onClick={() => { setNameInput(displayName); setEditingName(true); setNameFeedback(null); }}
                  style={{
                    padding: "6px 14px", borderRadius: "var(--db-radius-sm)",
                    background: "transparent", color: "var(--text-2)",
                    border: "1px solid var(--border-2)", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--text-2)"; e.currentTarget.style.color = "var(--text-1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-2)"; e.currentTarget.style.color = "var(--text-2)"; }}
                >
                  수정
                </button>
              )}
            </div>

            <div style={{ ...accountRowStyle, borderBottom: "none", paddingBottom: 0 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>이메일</div>
                <div style={{ fontSize: 14, color: "var(--text-1)", lineHeight: 1.6 }}>
                  {email || "—"}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100,
                background: "transparent", color: "var(--text-3)", border: "1px solid var(--border-2)",
              }}>
                OAuth 연동
              </span>
            </div>
          </div>
        </Card>

        {/* ── 3. 활동 요약 ── */}
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>활동 요약</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "내 프로젝트",   value: loadingP ? "—" : projects.length, icon: "📁" },
              { label: "생성된 명세서",  value: loadingP ? "—" : projects.reduce((a, p) => a + (p.specCount || 0), 0), icon: "📄" },
              { label: "소속 팀",        value: loadingT ? "—" : teams.length, icon: "👥" },
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

        {/* ── 4. 워크스페이스 / 초대코드 ── */}
        <TeamWorkspacePanel
          teams={teams}
          loading={loadingT}
          onTeamsChanged={refreshTeams}
        />

        {/* ── 5. 계정 관리 (로그아웃) ── */}
        <Card>
          <SectionTitle>계정 관리</SectionTitle>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>로그아웃</div>
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
                현재 세션을 종료하고 로그인 화면으로 돌아갑니다.
              </div>
            </div>
            {!confirmLogout ? (
              <button
                onClick={() => setConfirmLogout(true)}
                style={{
                  padding: "9px 20px", borderRadius: "var(--db-radius-sm)",
                  background: "transparent", color: "#ef4444",
                  border: "1px solid rgba(239,68,68,0.35)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                로그아웃
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>정말 로그아웃하시겠어요?</span>
                <button
                  onClick={() => setConfirmLogout(false)}
                  disabled={loggingOut}
                  style={{
                    padding: "7px 16px", borderRadius: "var(--db-radius-sm)",
                    background: "var(--surface)", color: "var(--text-2)",
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
                    <><Spinner size={12} color="white" />로그아웃 중...</>
                  ) : "로그아웃"}
                </button>
              </div>
            )}
          </div>
        </Card>

      </div>

      <style>{`
        @keyframes mp-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
