"use client";

export function Card({ children, style }) {
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

export function SectionTitle({ children, subtitle }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: "var(--text-3)",
        letterSpacing: ".07em",
        textTransform: "uppercase",
      }}>
        {children}
      </div>
      {subtitle && (
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, desc }) {
  return (
    <div style={{
      textAlign: "center",
      padding: "28px 12px",
      color: "var(--text-3)",
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
        {desc}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-3)"
        strokeWidth="2"
        style={{ animation: "team-spin 0.9s linear infinite" }}
      >
        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
      </svg>
    </div>
  );
}
