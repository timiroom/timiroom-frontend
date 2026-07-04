"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { fetchTeamInvitePreview, getMyTeams, joinTeamByInviteCode } from "@/lib/teamApi";

function Card({ children, style, className = "" }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--db-radius-lg)",
      padding: 24,
      ...style,
    }} className={className}>
      {children}
    </div>
  );
}

function Badge({ children, tone = "neutral" }) {
  const styles = {
    neutral: {
      border: "1px solid var(--border-2)",
      background: "transparent",
      color: "var(--text-2)",
    },
    owner: {
      border: "1px solid var(--border)",
      background: "transparent",
      color: "var(--text-1)",
    },
    success: {
      border: "1px solid rgba(16,185,129,0.25)",
      background: "transparent",
      color: "#059669",
    },
  };

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "3px 9px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 700,
      ...styles[tone],
    }}>
      {children}
    </span>
  );
}

function ActionButton({ children, onClick, disabled = false, variant = "primary" }) {
  const base = {
    padding: "11px 16px",
    borderRadius: "var(--db-radius-sm)",
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "progress" : "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
  };

  const styles = variant === "primary"
    ? {
        border: "none",
        background: "var(--text-1)",
        color: "var(--bg)",
      }
    : {
        border: "1px solid var(--border-2)",
        background: "transparent",
        color: "var(--text-2)",
      };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...base,
        ...styles,
        opacity: disabled ? 0.72 : 1,
      }}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ animation: "invite-spin 0.9s linear infinite" }}>
        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function WorkspaceInviteLanding({ inviteCode }) {
  const router = useRouter();
  const { user, isLoading: authLoading, openAuthModal } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [isMember, setIsMember] = useState(false);
  const authPromptedRef = useRef(false);

  const inviteLabel = useMemo(() => (inviteCode || "").trim().toUpperCase(), [inviteCode]);

  useEffect(() => {
    if (!inviteLabel) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    setPreview(null);
    setIsMember(false);

    (async () => {
      try {
        const data = await fetchTeamInvitePreview(inviteLabel);
        if (cancelled) return;
        setPreview(data);

        if (user) {
          const teams = await getMyTeams();
          if (cancelled) return;
          setIsMember(Array.isArray(teams) && teams.some((team) => String(team.teamId ?? team.id) === String(data.teamId)));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "초대 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteLabel, user]);

  useEffect(() => {
    if (authLoading) return;
    if (user || !preview || authPromptedRef.current) return;

    authPromptedRef.current = true;
    openAuthModal(typeof window !== "undefined" ? window.location.pathname : null);
  }, [authLoading, openAuthModal, preview, user]);

  async function handleJoin() {
    if (!inviteLabel) return;

    setJoining(true);
    setError("");
    try {
      await joinTeamByInviteCode(inviteLabel);
      router.replace("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "워크스페이스 참여에 실패했습니다.";
      if (message.includes("이미 팀에 속해 있습니다")) {
        router.replace("/dashboard");
        return;
      }
      setError(message);
    } finally {
      setJoining(false);
    }
  }

  const workspaceName = preview?.teamName ?? "워크스페이스";
  const description = preview?.description?.trim() || "워크스페이스 설명이 아직 없습니다.";
  const ownerName = preview?.ownerName || "알 수 없음";
  const memberCount = preview?.memberCount ?? 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text-1)",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      <div style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "40px 24px 72px",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 28,
          flexWrap: "wrap",
        }}>
          <Link href="/" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--text-1)",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 700,
          }}>
            <span style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "var(--text-1)",
              color: "var(--bg)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
            }}>
              A
            </span>
            Align-it
          </Link>
          <Link href="/dashboard" style={{
            fontSize: 13,
            color: "var(--text-3)",
            textDecoration: "none",
          }}>
            대시보드로 돌아가기
          </Link>
        </div>

        <div className="invite-grid" style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)",
          gap: 18,
          alignItems: "start",
        }}>
          <Card style={{ minHeight: 360 }}>
            {loading ? (
              <Spinner />
            ) : error ? (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                minHeight: 300,
                gap: 14,
              }}>
                <div style={{ fontSize: 40 }}>⚠️</div>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em" }}>
                  초대 링크를 찾을 수 없습니다
                </div>
                <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
                  {error}
                </div>
                <ActionButton onClick={() => router.push("/")}>홈으로 이동</ActionButton>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 18 }}>
                <div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-3)",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}>
                    워크스페이스 초대
                  </div>
                  <div style={{
                    fontSize: 30,
                    fontWeight: 900,
                    lineHeight: 1.15,
                    letterSpacing: "-.04em",
                  }}>
                    {workspaceName}
                  </div>
                  <div style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: "var(--text-3)",
                    lineHeight: 1.8,
                  }}>
                    {description}
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}>
                  <Badge tone="owner">소유자 {ownerName}</Badge>
                  <Badge tone="neutral">멤버 {memberCount}명</Badge>
                  <Badge tone="neutral">{inviteLabel}</Badge>
                </div>

                <div style={{
                  padding: "16px 18px",
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  display: "grid",
                  gap: 10,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)" }}>
                    이 링크로 초대받은 워크스페이스에 참여할 수 있어요.
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.8 }}>
                    로그인한 계정으로 참여하면 워크스페이스의 프로젝트와 멤버를 바로 확인할 수 있습니다.
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="invite-sticky" style={{ position: "sticky", top: 24 }}>
            {loading ? (
              <Spinner />
            ) : error ? (
              <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
                초대 정보를 먼저 불러와야 합니다.
              </div>
            ) : isMember ? (
              <div style={{ display: "grid", gap: 14 }}>
                <Badge tone="success">이미 참여 중</Badge>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em" }}>
                  이미 이 워크스페이스에 속해 있어요.
                </div>
                <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
                  대시보드에서 바로 이어서 작업할 수 있습니다.
                </div>
                <ActionButton onClick={() => router.replace("/dashboard")}>
                  대시보드 열기
                </ActionButton>
              </div>
            ) : !user ? (
              <div style={{ display: "grid", gap: 14 }}>
                <Badge tone="neutral">로그인 필요</Badge>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em" }}>
                  로그인 후 참여할 수 있어요.
                </div>
                <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
                  로그인 창이 열려 있습니다. 닫았다면 아래 버튼으로 다시 열 수 있어요.
                </div>
                <ActionButton onClick={() => openAuthModal(typeof window !== "undefined" ? window.location.pathname : null)}>
                  로그인 창 다시 열기
                </ActionButton>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <Badge tone="neutral">참여 준비 완료</Badge>
                <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em" }}>
                  참여 버튼을 누르면 바로 합류합니다.
                </div>
                <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
                  참여 후 대시보드로 이동해서 워크스페이스와 프로젝트를 확인할 수 있어요.
                </div>
                <ActionButton onClick={handleJoin} disabled={joining}>
                  {joining ? "참여 중..." : "참여하기"}
                </ActionButton>
              </div>
            )}

            {error && (
              <div style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid var(--border)",
                color: "#dc2626",
                fontSize: 12,
                fontWeight: 600,
                lineHeight: 1.7,
              }}>
                {error}
              </div>
            )}
          </Card>
        </div>
      </div>

      <style>{`
        @keyframes invite-spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .invite-grid {
            grid-template-columns: 1fr !important;
          }
          .invite-sticky {
            position: static !important;
            top: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
