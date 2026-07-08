"use client";

const COLORS = {
  idle: {
    text: "var(--text-3)",
    bg: "rgba(0,0,0,0.04)",
    border: "rgba(0,0,0,0.08)",
  },
  dirty: {
    text: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.24)",
  },
  syncing: {
    text: "#3b82f6",
    bg: "rgba(59,130,246,0.1)",
    border: "rgba(59,130,246,0.24)",
  },
  synced: {
    text: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.24)",
  },
};

const LABELS = {
  idle: "저장됨",
  dirty: "변경 있음",
  syncing: "동기화 중",
  synced: "동기화 완료",
};

export function DocumentSyncBadge({ status = "idle", label, compact = false }) {
  const color = COLORS[status] ?? COLORS.idle;
  const showDot = status === "syncing" || status === "dirty";

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: compact ? 4 : 6,
      padding: compact ? "2px 6px" : "3px 9px",
      borderRadius: 999,
      border: `1px solid ${color.border}`,
      background: color.bg,
      color: color.text,
      fontSize: compact ? 10 : 11,
      fontWeight: 800,
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}>
      {showDot && (
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "currentColor",
          animation: status === "syncing" ? "db-pulse 1.2s infinite" : "none",
          flexShrink: 0,
        }} />
      )}
      {label || LABELS[status] || LABELS.idle}
    </span>
  );
}

export function getDocumentSyncStatus(syncState, docId) {
  if (!syncState || syncState.status === "idle") return "idle";
  if (syncState.source === docId && syncState.status === "dirty") return "dirty";
  if (syncState.source === docId && syncState.status === "syncing") return "syncing";
  if (syncState.targets?.includes(docId)) return syncState.status === "done" ? "synced" : "syncing";
  return "idle";
}
