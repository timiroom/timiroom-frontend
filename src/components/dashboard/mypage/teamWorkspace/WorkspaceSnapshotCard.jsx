"use client";

import { useState } from "react";
import { buildInviteLink, getTeamId } from "./helpers";
import { Spinner, EmptyState } from "./PanelPrimitives";

export function WorkspaceSnapshotCard({
  workspaceLoading,
  workspaceError,
  workspaceSummary,
  isOwner,
  isActiveWorkspace,
  teamMembers = [],
  copiedTeamId,
  onCopy,
  onSetActiveWorkspace,
}) {
  const [linkCopied, setLinkCopied] = useState(false);

  if (workspaceLoading) return <Spinner />;

  if (workspaceError) {
    return (
      <EmptyState icon="⚠️" title="불러오지 못했습니다" desc={workspaceError} />
    );
  }

  if (!workspaceSummary) {
    return (
      <EmptyState
        icon="👆"
        title="워크스페이스를 선택하세요"
        desc="왼쪽 목록에서 워크스페이스를 클릭하면 요약 정보를 볼 수 있어요."
      />
    );
  }

  const teamId = getTeamId(workspaceSummary);
  const inviteCode = workspaceSummary.inviteCode ?? "";
  const inviteLink = buildInviteLink(inviteCode);
  const name = workspaceSummary.teamName ?? workspaceSummary.name ?? "워크스페이스";
  const description = workspaceSummary.description?.trim() || "";

  async function handleCopyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1200);
    } catch {}
  }

  const chip = (label, color = "var(--text-3)", bg = "var(--border)") => (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: "2px 8px",
      borderRadius: 999,
      background: bg,
      color,
      whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );

  const smallBtn = (onClick, children, opts = {}) => (
    <button
      type="button"
      onClick={onClick}
      disabled={opts.disabled}
      style={{
        padding: "6px 10px",
        borderRadius: "var(--db-radius-sm)",
        border: "1px solid var(--border-2)",
        background: "var(--surface)",
        color: "var(--text-2)",
        fontSize: 11,
        fontWeight: 700,
        cursor: opts.disabled ? "default" : "pointer",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        opacity: opts.disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 헤더 */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text-1)" }}>{name}</span>
          {chip(
            isOwner ? "소유자" : (workspaceSummary?.viewerRole === "GUEST" ? "게스트" : "멤버"),
            isOwner ? "var(--text-1)" : (workspaceSummary?.viewerRole === "GUEST" ? "#B45309" : "#2563EB"),
            isOwner ? "rgba(26,25,22,0.1)" : (workspaceSummary?.viewerRole === "GUEST" ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.08)"),
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
          {description || "설명이 없습니다."}
        </div>
      </div>

      {/* 멤버 요약 */}
      {teamMembers.length > 0 && (
        <div style={{
          padding: "10px 14px",
          borderRadius: "var(--db-radius)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>
            멤버 {teamMembers.length}명
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {teamMembers.map((m) => (
              <div key={m.memberId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 600 }}>
                  {m.memberName}
                </span>
                {chip(
                  m.teamRole === "OWNER" ? "소유자" : m.teamRole === "GUEST" ? "게스트" : "멤버",
                  m.teamRole === "OWNER" ? "var(--text-2)" : m.teamRole === "GUEST" ? "#B45309" : "var(--text-3)",
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 초대 코드 (소유자만) */}
      {isOwner && inviteCode && (
        <div style={{
          padding: "10px 14px",
          borderRadius: "var(--db-radius)",
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>
            초대 코드
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <code style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: ".08em",
              padding: "5px 10px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-1)",
            }}>
              {inviteCode}
            </code>
            {smallBtn(() => onCopy(inviteCode, teamId), copiedTeamId === teamId ? "복사됨" : "코드 복사")}
            {smallBtn(handleCopyLink, linkCopied ? "복사됨" : "링크 복사")}
          </div>
        </div>
      )}

      {/* 액션 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <a
          href="/dashboard"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-2)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          대시보드에서 관리하기 →
        </a>

        <button
          type="button"
          onClick={() => onSetActiveWorkspace(teamId)}
          disabled={isActiveWorkspace}
          style={{
            padding: "8px 13px",
            borderRadius: "var(--db-radius-sm)",
            border: "1px solid var(--border-2)",
            background: isActiveWorkspace ? "var(--border)" : "var(--surface)",
            color: isActiveWorkspace ? "var(--text-3)" : "var(--text-2)",
            fontSize: 12,
            fontWeight: 700,
            cursor: isActiveWorkspace ? "default" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {isActiveWorkspace ? "현재 작업공간" : "현재 작업공간으로 설정"}
        </button>
      </div>
    </div>
  );
}
