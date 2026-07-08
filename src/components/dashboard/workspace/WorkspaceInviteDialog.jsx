"use client";

export function WorkspaceInviteDialog({
  open,
  workspace,
  members = [],
  copied,
  regenerating,
  error,
  onClose,
  onCopy,
  onRegenerate,
  onOpenManage,
}) {
  if (!open) return null;

  const workspaceName = workspace?.teamName ?? workspace?.name ?? "워크스페이스";
  const workspaceDescription = workspace?.description?.trim() || "";
  const inviteCode = workspace?.inviteCode ?? "";
  const viewerRole = workspace?.viewerRole ?? "MEMBER";
  const isOwner = viewerRole === "OWNER";

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(8,8,8,0.42)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 240,
      padding: 20,
    }}>
      <div style={{
        width: "min(560px, 100%)",
        background: "var(--surface)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 22,
        boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
        overflow: "hidden",
      }}>
        <div style={{
          padding: "18px 22px",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--text-1)" }}>
              워크스페이스 초대
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
              {workspaceName} · {members.length}명 · {viewerRole === "OWNER" ? "소유자" : viewerRole === "GUEST" ? "게스트" : "멤버"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8, lineHeight: 1.6 }}>
              {workspaceDescription || "워크스페이스 설명이 아직 없습니다."}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.08)",
              background: "var(--surface)",
              color: "var(--text-2)",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 22, display: "grid", gap: 14 }}>
          <div style={{
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(26,25,22,0.04)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10 }}>
              초대 코드
            </div>

            {inviteCode ? (
              <>
                <div style={{
                  fontSize: 20,
                  fontWeight: 900,
                  letterSpacing: ".18em",
                  color: "var(--text-1)",
                  marginBottom: 12,
                }}>
                  {inviteCode}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={onCopy}
                    style={secondaryButtonStyle()}
                  >
                    {copied ? "복사 완료" : "초대 코드 복사"}
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={onRegenerate}
                      disabled={regenerating}
                      style={secondaryButtonStyle(regenerating)}
                    >
                      {regenerating ? "재발급 중" : "초대 코드 재발급"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.7 }}>
                {isOwner
                  ? "초대 코드를 아직 불러오지 못했어요. 잠시 후 다시 시도하거나 새로 발급해 주세요."
                  : "초대 코드는 소유자만 확인하고 새로 발급할 수 있어요."}
              </div>
            )}
          </div>

          <div style={{
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "var(--surface)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 10 }}>
              함께하는 멤버
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
              {members.map((member) => (
                <div
                  key={member.memberId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "var(--bg)",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                      {member.memberName}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                      {member.email || "이메일 정보 없음"}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: member.teamRole === "OWNER" ? "rgba(26,25,22,0.1)" : member.teamRole === "GUEST" ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.08)",
                    color: member.teamRole === "OWNER" ? "var(--text-1)" : member.teamRole === "GUEST" ? "#B45309" : "#2563EB",
                    whiteSpace: "nowrap",
                  }}>
                    {member.teamRole === "OWNER" ? "소유자" : member.teamRole === "GUEST" ? "게스트" : "멤버"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            padding: 16,
            borderRadius: 16,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(26,25,22,0.03)",
          }}>
            <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.7 }}>
              워크스페이스 이름과 설명 수정, 소유자 이전, 멤버 권한 정리는 관리 탭에서 할 수 있어요.
            </div>
            <button
              type="button"
              onClick={onOpenManage}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "var(--surface)",
                color: "var(--text-2)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              관리 탭으로 이동
            </button>
          </div>

          {error && (
            <div style={{ color: "#dc2626", fontSize: 12, fontWeight: 600 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function secondaryButtonStyle(disabled = false) {
  return {
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "var(--surface)",
    color: "var(--text-2)",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "progress" : "pointer",
    fontFamily: "inherit",
    opacity: disabled ? 0.7 : 1,
  };
}
