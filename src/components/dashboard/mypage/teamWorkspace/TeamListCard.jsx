"use client";

import { getTeamId } from "./helpers";

const ROLE_META = {
  OWNER: {
    label: "소유자",
    background: "rgba(26,25,22,0.1)",
    color: "var(--text-1)",
  },
  MEMBER: {
    label: "멤버",
    background: "rgba(59,130,246,0.08)",
    color: "#2563EB",
  },
};

export function TeamListCard({ team, active, selected, copiedTeamId, onCopy, onSelect }) {
  const teamId = getTeamId(team);
  const inviteCode = team?.inviteCode || "";
  const description = team?.description || "설명이 없습니다.";
  const roleMeta = ROLE_META[team?.viewerRole] ?? ROLE_META.MEMBER;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(teamId)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(teamId);
        }
      }}
      style={{
        textAlign: "left",
        width: "100%",
        padding: "14px 16px",
        background: selected ? "var(--bg)" : "transparent",
        border: `1px solid ${selected ? "var(--border-2)" : "var(--border)"}`,
        borderRadius: "var(--db-radius)",
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-1)",
            }}>
              {team?.teamName ?? team?.name ?? "워크스페이스"}
            </div>
            {active && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(107,85,220,0.12)",
                color: "var(--db-purple-300)",
              }}>
                현재 작업중
              </span>
            )}
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              background: roleMeta.background,
              color: roleMeta.color,
            }}>
              {roleMeta.label}
            </span>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, lineHeight: 1.5 }}>
            {description}
          </div>

          {inviteCode && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <code style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".08em",
                padding: "4px 9px",
                borderRadius: 999,
                background: "rgba(26,25,22,0.08)",
                color: "var(--text-1)",
              }}>
                {inviteCode}
              </code>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 999,
            background: "rgba(26,25,22,0.06)",
            color: "var(--text-2)",
          }}>
            워크스페이스
          </span>
          {inviteCode && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onCopy(inviteCode, teamId);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: "var(--db-radius-sm)",
                border: "1px solid var(--border-2)",
                background: "var(--surface)",
                color: "var(--text-2)",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {copiedTeamId === teamId ? "복사됨" : "코드 복사"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
