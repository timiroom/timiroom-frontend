"use client";

import { formatJoinedAt } from "./helpers";

function roleBadgeStyle(teamRole) {
  if (teamRole === "OWNER") return { background: "rgba(26,25,22,0.1)", color: "var(--text-1)" };
  if (teamRole === "GUEST") return { background: "rgba(245,158,11,0.1)", color: "#B45309" };
  return { background: "rgba(59,130,246,0.08)", color: "#2563EB" };
}

function roleLabel(teamRole) {
  if (teamRole === "OWNER") return "소유자";
  if (teamRole === "GUEST") return "게스트";
  return "멤버";
}

export function MemberRow({
  member,
  isSelf,
  canRemove,
  canChangeRole,
  onRemove,
  onRoleChange,
  removing,
  changingRole,
  background = "var(--bg)",
}) {
  const isOwner = member.teamRole === "OWNER";
  const badgeStyle = roleBadgeStyle(member.teamRole);

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "center",
      padding: "12px 14px",
      borderRadius: "var(--db-radius)",
      border: "1px solid var(--border)",
      background,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
            {member.memberName || "알 수 없음"}
          </div>
          {isSelf && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(16,185,129,0.1)",
              color: "#059669",
            }}>
              나
            </span>
          )}
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            ...badgeStyle,
          }}>
            {roleLabel(member.teamRole)}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
          {member.email || "이메일 정보 없음"}
        </div>
        {member.joinedAt && (
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
            합류 {formatJoinedAt(member.joinedAt)}
          </div>
        )}
      </div>

      {(canRemove || canChangeRole) && !isOwner && !isSelf && (
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {canChangeRole && (
            <select
              value={member.teamRole}
              disabled={changingRole}
              onChange={(e) => onRoleChange?.(member.memberId, e.target.value)}
              style={{
                padding: "5px 8px",
                borderRadius: "var(--db-radius-sm)",
                border: "1px solid var(--border-2)",
                background: "var(--surface)",
                color: "var(--text-2)",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "inherit",
                cursor: changingRole ? "progress" : "pointer",
                opacity: changingRole ? 0.7 : 1,
              }}
            >
              <option value="MEMBER">멤버</option>
              <option value="GUEST">게스트</option>
            </select>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(member.memberId)}
              disabled={removing}
              style={{
                padding: "7px 12px",
                borderRadius: "var(--db-radius-sm)",
                border: "1px solid rgba(239,68,68,0.22)",
                background: "rgba(239,68,68,0.06)",
                color: "#dc2626",
                fontSize: 11,
                fontWeight: 700,
                cursor: removing ? "progress" : "pointer",
                fontFamily: "inherit",
                opacity: removing ? 0.75 : 1,
              }}
            >
              {removing ? "처리 중" : "강퇴"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
