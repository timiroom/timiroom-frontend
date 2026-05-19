"use client";

/**
 * ErdPanel.jsx
 * ------------
 * ERD 명세서 패널 + AI 채팅 사이드바.
 *
 * project.dbSchema 구조 (DbaAgent 출력):
 * {
 *   tables: [{ name, columns: [{ name, type, constraints }], indexes: [string] }],
 *   relationships: [string]
 * }
 */

import { useState, useMemo } from "react";
import { AiChatSidebar } from "./AiChatSidebar";

/* ── 색상 토큰 ── */
const C = {
  bg:        "var(--surface)",
  surface:   "#f7f6f3",
  border:    "rgba(0,0,0,0.07)",
  text:      "#1a1916",
  muted:     "var(--text-3)",
  sub:       "var(--text-3)",
  accent:    "#6b6960",
  card:      "var(--surface)",
  codeBg:    "#f0eeeb",
};

/* ── 컬럼 타입 배지 ── */
function TypeBadge({ type }) {
  const t = (type || "").toUpperCase();
  let color = "#a8a69f";
  if (t.includes("INT") || t.includes("BIGINT") || t.includes("SERIAL")) color = "#60a5fa";
  else if (t.includes("VARCHAR") || t.includes("TEXT") || t.includes("CHAR")) color = "#34d399";
  else if (t.includes("BOOL"))   color = "#a78bfa";
  else if (t.includes("TIMESTAMP") || t.includes("DATE") || t.includes("TIME")) color = "#fbbf24";
  else if (t.includes("JSON") || t.includes("JSONB")) color = "#fb923c";
  else if (t.includes("UUID")) color = "#f472b6";

  return (
    <span style={{
      fontSize: 10, fontWeight: 700, fontFamily: "monospace",
      padding: "2px 7px", borderRadius: 4,
      background: `${color}14`, border: `1px solid ${color}30`, color,
      whiteSpace: "nowrap",
    }}>
      {type || "—"}
    </span>
  );
}

/* ── 제약조건 배지 ── */
function ConstraintBadge({ text }) {
  if (!text) return null;
  const upper = text.toUpperCase();
  let color = "rgba(107,105,96,0.5)";
  if (upper.includes("PK") || upper.includes("PRIMARY")) color = "#f87171";
  else if (upper.includes("FK") || upper.includes("FOREIGN")) color = "#fbbf24";
  else if (upper.includes("UNIQUE")) color = "#a78bfa";
  else if (upper.includes("NOT NULL")) color = "#94a3b8";

  return (
    <span style={{
      fontSize: 10, padding: "2px 6px", borderRadius: 4,
      background: `${color}14`, border: `1px solid ${color}30`, color,
      fontFamily: "monospace", whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

/* ── 테이블 카드 ── */
function TableCard({ table }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${open ? "rgba(107,105,96,0.2)" : C.border}`,
      background: C.card,
      marginBottom: 14,
      overflow: "hidden",
    }}>
      {/* 테이블 헤더 */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "13px 18px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
          borderBottom: open ? `1px solid ${C.border}` : "none",
        }}
      >
        {/* 아이콘 */}
        <span style={{ fontSize: 15, flexShrink: 0 }}>🗄️</span>

        {/* 테이블명 */}
        <code style={{
          flex: 1, fontSize: 14, fontWeight: 700, color: C.text,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}>
          {table.name}
        </code>

        {/* 컬럼 수 */}
        <span style={{
          fontSize: 11, color: C.muted, padding: "2px 8px", borderRadius: 10,
          background: "rgba(0,0,0,0.05)",
        }}>
          {table.columns?.length ?? 0}개 컬럼
        </span>

        {/* 토글 화살표 */}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke={C.muted} strokeWidth="2" strokeLinecap="round"
          style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* 컬럼 테이블 */}
      {open && (
        <div style={{ overflowX: "auto" }}>
          <table style={{
            width: "100%", borderCollapse: "collapse",
            fontSize: 12,
          }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                {["컬럼명", "타입", "제약조건"].map(h => (
                  <th key={h} style={{
                    padding: "8px 18px", textAlign: "left",
                    fontSize: 10, fontWeight: 700, color: C.sub,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    borderBottom: `1px solid ${C.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(table.columns || []).map((col, i) => (
                <tr key={i} style={{
                  borderBottom: i < table.columns.length - 1 ? `1px solid ${C.border}` : "none",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 18px" }}>
                    <code style={{
                      fontSize: 12, fontWeight: 600, color: C.text,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    }}>
                      {col.name}
                    </code>
                  </td>
                  <td style={{ padding: "10px 18px" }}>
                    <TypeBadge type={col.type} />
                  </td>
                  <td style={{ padding: "10px 18px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {(col.constraints || "").split(",").map(c => c.trim()).filter(Boolean).map((c, j) => (
                        <ConstraintBadge key={j} text={c} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 인덱스 */}
          {table.indexes?.length > 0 && (
            <div style={{
              padding: "10px 18px 14px",
              borderTop: `1px solid ${C.border}`,
              display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                인덱스
              </span>
              {table.indexes.map((idx, i) => (
                <span key={i} style={{
                  fontSize: 11, fontFamily: "monospace",
                  padding: "2px 8px", borderRadius: 4,
                  background: C.codeBg, border: `1px solid ${C.border}`,
                  color: C.accent,
                }}>
                  {idx}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 관계 섹션 ── */
function RelationshipsSection({ relationships }) {
  if (!relationships?.length) return null;
  return (
    <div style={{
      borderRadius: 10, border: `1px solid ${C.border}`,
      background: C.card, padding: "18px 20px", marginBottom: 14,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.sub,
        letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 14,
      }}>
        테이블 관계
      </div>
      {relationships.map((rel, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "8px 0",
          borderBottom: i < relationships.length - 1 ? `1px solid ${C.border}` : "none",
        }}>
          <span style={{
            fontSize: 16, flexShrink: 0, marginTop: 1,
          }}>↔</span>
          <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{rel}</span>
        </div>
      ))}
    </div>
  );
}

/* ── DB 스키마 → 텍스트 (AI 컨텍스트용) ── */
function schemaToText(schema) {
  if (!schema?.tables?.length) return "";
  return schema.tables.map(t => {
    const cols = (t.columns || []).map(c => `  ${c.name} ${c.type} ${c.constraints || ""}`).join("\n");
    return `TABLE ${t.name}:\n${cols}`;
  }).join("\n\n");
}

/* ══════════════════════════════════════
   ERD PANEL (exported)
══════════════════════════════════════ */
export function ErdPanel({ project }) {
  const [search, setSearch] = useState("");

  const schema = useMemo(() => {
    const s = project?.dbSchema;
    if (!s || typeof s !== "object") return null;
    if (!Array.isArray(s.tables) || s.tables.length === 0) return null;
    return s;
  }, [project]);

  const filteredTables = useMemo(() => {
    if (!schema) return [];
    if (!search) return schema.tables;
    const q = search.toLowerCase();
    return schema.tables.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.columns?.some(c => c.name?.toLowerCase().includes(q))
    );
  }, [schema, search]);

  const currentContent = useMemo(() => schemaToText(schema), [schema]);

  return (
    <div style={{
      flex: 1, display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* ── 왼쪽: ERD 뷰어 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 상단 헤더 */}
        <div style={{
          height: 52, flexShrink: 0,
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center",
          padding: "0 28px", justifyContent: "space-between",
          background: C.surface,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {project && (
              <>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  background: `${project.color || "var(--text-1)"}22`,
                  border: `1px solid ${project.color || "var(--text-1)"}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 900, color: project.color || "#6b6960",
                }}>
                  {(project.name || "P").charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{project.name}</span>
                <span style={{ fontSize: 13, color: C.sub }}>›</span>
              </>
            )}
            <span style={{
              fontSize: 13, fontWeight: 500, color: "#34d399",
              padding: "2px 8px", borderRadius: 6,
              background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
            }}>
              ERD 명세서
            </span>
            {schema && (
              <span style={{
                fontSize: 11, color: C.muted, padding: "2px 8px", borderRadius: 10,
                background: "rgba(0,0,0,0.05)",
              }}>
                {schema.tables.length}개 테이블
              </span>
            )}
          </div>

          {/* 검색 */}
          {schema && (
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }}
                width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="테이블 / 컬럼 검색..."
                style={{
                  padding: "7px 12px 7px 28px", width: 200,
                  background: C.bg, border: `1px solid ${C.border}`,
                  borderRadius: 8, fontSize: 12, color: C.text, outline: "none",
                }}
              />
            </div>
          )}
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 28px 60px" }}>

            {!schema && <EmptyState />}

            {schema && !search && (
              <RelationshipsSection relationships={schema.relationships} />
            )}

            {filteredTables.length > 0
              ? filteredTables.map((t, i) => <TableCard key={i} table={t} />)
              : schema && search && (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.sub, fontSize: 14 }}>
                  검색 결과가 없습니다
                </div>
              )
            }
          </div>
        </div>
      </div>

      {/* ── 오른쪽: AI 채팅 ── */}
      <AiChatSidebar
        contextType="erd"
        project={project}
        currentContent={currentContent}
        onApplyContent={undefined}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "80px 0", gap: 16,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
      }}>🗄️</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1916", marginBottom: 6 }}>
          DB 스키마가 없습니다
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6 }}>
          파이프라인을 실행하면 ERD가 자동으로 생성됩니다
        </div>
      </div>
    </div>
  );
}
