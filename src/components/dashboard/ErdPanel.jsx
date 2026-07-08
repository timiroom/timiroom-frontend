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
import { DocumentSyncBadge, getDocumentSyncStatus } from "./DocumentSyncBadge";

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

/* ── 테이블 카드 ── */
function TableCard({ table, isSynced, onDirty }) {
  const [open, setOpen] = useState(true);
  const [draftTable, setDraftTable] = useState(table);

  function updateTableName(value) {
    setDraftTable(prev => ({ ...prev, name: value }));
    onDirty?.();
  }

  function updateColumn(index, field, value) {
    setDraftTable(prev => ({
      ...prev,
      columns: (prev.columns || []).map((column, columnIndex) => (
        columnIndex === index ? { ...column, [field]: value } : column
      )),
    }));
    onDirty?.();
  }

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${isSynced ? "rgba(16,185,129,0.38)" : open ? "rgba(107,105,96,0.2)" : C.border}`,
      background: isSynced ? "rgba(16,185,129,0.06)" : C.card,
      boxShadow: isSynced ? "0 0 0 3px rgba(16,185,129,0.08)" : "none",
      marginBottom: 14,
      overflow: "hidden",
    }}>
      {/* 테이블 헤더 */}
      <div
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "13px 18px", background: "none", border: "none",
          textAlign: "left",
          borderBottom: open ? `1px solid ${C.border}` : "none",
          boxSizing: "border-box",
        }}
      >
        {/* 아이콘 */}
        <span style={{ fontSize: 15, flexShrink: 0 }}>🗄️</span>

        {/* 테이블명 */}
        <input
          value={draftTable.name}
          onChange={event => updateTableName(event.target.value)}
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 700,
            color: C.text,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            background: C.card,
            padding: "5px 7px",
            outline: "none",
          }}
        />
        {isSynced && <DocumentSyncBadge status="synced" label="PRD 반영" compact />}

        {/* 컬럼 수 */}
        <span style={{
          fontSize: 11, color: C.muted, padding: "2px 8px", borderRadius: 10,
          background: "rgba(0,0,0,0.05)",
        }}>
          {draftTable.columns?.length ?? 0}개 컬럼
        </span>

        {/* 토글 화살표 */}
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            width: 28,
            height: 28,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            background: C.card,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          title={open ? "접기" : "펼치기"}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke={C.muted} strokeWidth="2" strokeLinecap="round"
            style={{ transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

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
              {(draftTable.columns || []).map((col, i) => (
                <tr key={i} style={{
                  borderBottom: i < draftTable.columns.length - 1 ? `1px solid ${C.border}` : "none",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 18px" }}>
                    <input
                      value={col.name}
                      onChange={event => updateColumn(i, "name", event.target.value)}
                      style={{
                      fontSize: 12, fontWeight: 600, color: C.text,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      background: C.card,
                      padding: "5px 7px",
                      outline: "none",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    />
                  </td>
                  <td style={{ padding: "10px 18px" }}>
                    <input
                      value={col.type}
                      onChange={event => updateColumn(i, "type", event.target.value)}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        color: "#60a5fa",
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        background: C.card,
                        padding: "5px 7px",
                        outline: "none",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </td>
                  <td style={{ padding: "10px 18px" }}>
                    <input
                      value={col.constraints || ""}
                      onChange={event => updateColumn(i, "constraints", event.target.value)}
                      style={{
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        color: C.text,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        background: C.card,
                        padding: "5px 7px",
                        outline: "none",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 인덱스 */}
          {draftTable.indexes?.length > 0 && (
            <div style={{
              padding: "10px 18px 14px",
              borderTop: `1px solid ${C.border}`,
              display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                인덱스
              </span>
              {draftTable.indexes.map((idx, i) => (
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

function EditableRelationshipsSection({ schema, onUpdateRelationships, onDirty }) {
  const relationships = schema.relationships || [];
  const tables = schema.tables || [];

  const handleUpdate = (idx, t1, type, t2) => {
    const next = [...relationships];
    next[idx] = `${t1} ${type} ${t2}`;
    if (onUpdateRelationships) onUpdateRelationships(next);
    if (onDirty) onDirty();
  };

  const handleAdd = () => {
    const defaultT1 = tables.length > 0 ? tables[0].name : "table1";
    const defaultT2 = tables.length > 1 ? tables[1].name : defaultT1;
    const next = [...relationships, `${defaultT1} 1:N ${defaultT2}`];
    if (onUpdateRelationships) onUpdateRelationships(next);
    if (onDirty) onDirty();
  };

  const handleDelete = (idx) => {
    const next = [...relationships];
    next.splice(idx, 1);
    if (onUpdateRelationships) onUpdateRelationships(next);
    if (onDirty) onDirty();
  };

  if (relationships.length === 0) {
    return (
      <div style={{ marginBottom: 14 }}>
        <button onClick={handleAdd} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px dashed rgba(107,85,220,0.5)", background: "rgba(107,85,220,0.03)", color: "var(--db-purple-500)", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <span>+</span> 새 관계 추가
        </button>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 10, border: `1px solid ${C.border}`,
      background: C.card, padding: "18px 20px", marginBottom: 14,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.sub,
        letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12,
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <span>테이블 관계</span>
        <button onClick={handleAdd} style={{ background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>+ 관계 추가</button>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {relationships.map((relStr, idx) => {
          let t1 = "table1", type = "1:N", t2 = "table2";
          const match = typeof relStr === "string" ? relStr.match(/([a-zA-Z0-9_]+).*?(1:1|1:N|N:1|N:M).*?([a-zA-Z0-9_]+)$/) : null;
          if (match) {
            t1 = match[1]; type = match[2]; t2 = match[3];
          } else if (typeof relStr === "string") {
            const parts = relStr.trim().split(/\s+/);
            if (parts.length >= 3) { t1 = parts[0]; type = "1:N"; t2 = parts[parts.length - 1]; }
            else if (parts.length > 0) { t1 = parts[0]; }
          }
          
          return (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}` }}>
              <select value={t1} onChange={e => handleUpdate(idx, e.target.value, type, t2)} style={{ flex: 1, padding: "6px 4px", fontSize: 12, borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface, color: C.text, outline: "none" }}>
                <option value={t1}>{t1}</option>
                {tables.map(t => t.name !== t1 && <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
              
              <select value={type} onChange={e => handleUpdate(idx, t1, e.target.value, t2)} style={{ width: 70, padding: "6px 4px", fontSize: 11, fontWeight: 800, color: "#60a5fa", borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface, outline: "none", textAlign: "center" }}>
                {["1:1", "1:N", "N:1", "N:M"].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              
              <select value={t2} onChange={e => handleUpdate(idx, t1, type, e.target.value)} style={{ flex: 1, padding: "6px 4px", fontSize: 12, borderRadius: 4, border: `1px solid ${C.border}`, background: C.surface, color: C.text, outline: "none" }}>
                <option value={t2}>{t2}</option>
                {tables.map(t => t.name !== t2 && <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
              
              <button onClick={() => handleDelete(idx)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, padding: "0 6px", fontWeight: "bold" }}>×</button>
            </div>
          );
        })}
      </div>
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
export function ErdPanel({ project, syncState, onSave }) {
  const [search, setSearch] = useState("");
  const [isModified, setIsModified] = useState(false);
  const syncStatus = getDocumentSyncStatus(syncState, "erd");
  const displayStatus = isModified ? "dirty" : syncStatus;

  const [localSchema, setLocalSchema] = useState(() => {
    const s = project?.dbSchema;
    if (s && typeof s === "object" && Array.isArray(s.tables) && s.tables.length > 0) return s;
    return { tables: [], relationships: [] };
  });

  const schema = localSchema;

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
            {displayStatus !== "idle" && (
              <DocumentSyncBadge
                status={displayStatus}
                label={displayStatus === "dirty" ? "저장 필요" : syncStatus === "syncing" ? "PRD 반영 중" : "PRD 반영 완료"}
              />
            )}
            {schema && (
              <span style={{
                fontSize: 11, color: C.muted, padding: "2px 8px", borderRadius: 10,
                background: "rgba(0,0,0,0.05)",
              }}>
                {schema.tables.length}개 테이블
              </span>
            )}
          </div>

          {/* 검색 및 액션 */}
          {schema && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

              <button
                disabled={!isModified}
                onClick={() => {
                  setIsModified(false);
                  onSave?.();
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 7,
                  border: isModified ? "none" : `1px solid ${C.border}`,
                  background: isModified ? "var(--text-1)" : "rgba(0,0,0,0.05)",
                  color: isModified ? "#fff" : "var(--text-3)",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isModified ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                저장
              </button>
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
            </div>
          )}
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 28px 60px" }}>

            {!schema && <EmptyState />}

            {schema && !search && (
              <EditableRelationshipsSection 
                schema={schema} 
                onUpdateRelationships={(newRels) => {
                  setLocalSchema(prev => ({ ...prev, relationships: newRels }));
                  setIsModified(true);
                }}
                onDirty={() => setIsModified(true)} 
              />
            )}

            {/* 새 테이블 추가 버튼 */}
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => {
                  const newSchema = { ...localSchema, tables: [...(localSchema.tables || [])] };
                  newSchema.tables.push({
                    name: "new_table",
                    columns: [
                      { name: "id", type: "BIGINT", constraints: "PK" }
                    ]
                  });
                  setLocalSchema(newSchema);
                  setIsModified(true);
                }}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "1px dashed var(--db-purple-400)",
                  background: "rgba(107,85,220,0.05)", color: "var(--db-purple-500)",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(107,85,220,0.1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(107,85,220,0.05)";
                }}
              >
                <span>+</span> 새 테이블 추가
              </button>
            </div>

            {filteredTables.length > 0
              ? filteredTables.map((t, i) => (
                <TableCard
                  key={i}
                  table={t}
                  isSynced={syncStatus !== "idle" && t.name === "chat_messages"}
                  onDirty={() => setIsModified(true)}
                />
              ))
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
