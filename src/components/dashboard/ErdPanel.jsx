"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AiChatDock } from "./AiChatDock";
import { ConsistencyBadge } from "./ConsistencyBadge";
import { updateArtifact } from "@/lib/pipelineApi";

const C = {
  bg:      "var(--surface)",
  surface: "#f7f6f3",
  border:  "rgba(0,0,0,0.07)",
  text:    "#1a1916",
  muted:   "var(--text-3)",
  sub:     "var(--text-3)",
  accent:  "#6b6960",
  card:    "#ffffff",
  codeBg:  "#f0eeeb",
};

const SQL_TYPES = [
  "BIGINT","INTEGER","SMALLINT","SERIAL","BIGSERIAL",
  "VARCHAR(255)","VARCHAR(100)","VARCHAR(36)","TEXT","CHAR(36)",
  "BOOLEAN",
  "TIMESTAMP","TIMESTAMP WITH TIME ZONE","DATE","TIME",
  "JSONB","JSON",
  "UUID",
  "DECIMAL(10,2)","NUMERIC","FLOAT","DOUBLE PRECISION",
  "BYTEA",
];

const CARDINALITIES = ["1:1","1:N","N:1","N:M","M:N"];

const TYPE_GROUPS = [
  { label: "정수형",  types: ["BIGINT","INTEGER","SMALLINT","SERIAL","BIGSERIAL"] },
  { label: "문자형",  types: ["VARCHAR(255)","VARCHAR(100)","VARCHAR(36)","TEXT","CHAR(36)"] },
  { label: "불리언",  types: ["BOOLEAN"] },
  { label: "날짜/시간", types: ["TIMESTAMP","TIMESTAMP WITH TIME ZONE","DATE","TIME"] },
  { label: "JSON",    types: ["JSONB","JSON"] },
  { label: "고유값",  types: ["UUID"] },
  { label: "소수형",  types: ["DECIMAL(10,2)","NUMERIC","FLOAT","DOUBLE PRECISION"] },
  { label: "기타",    types: ["BYTEA"] },
];

const CARD_INFO = {
  "1:1": { label: "일대일 (1:1)", desc: "각 레코드가 정확히 하나의 관련 레코드를 가짐" },
  "1:N": { label: "일대다 (1:N)", desc: "하나의 레코드가 여러 관련 레코드를 가짐" },
  "N:1": { label: "다대일 (N:1)", desc: "여러 레코드가 하나의 관련 레코드를 공유" },
  "N:M": { label: "다대다 (N:M)", desc: "중간 테이블을 통해 연결됨" },
  "M:N": { label: "다대다 (M:N)", desc: "중간 테이블을 통해 연결됨" },
};

/* ══════════════════════════════════════
   커스텀 타입 선택창 (datalist 대체)
══════════════════════════════════════ */
function CustomTypeSelect({ value, onChange }) {
  const [open,   setOpen]   = useState(false);
  const [filter, setFilter] = useState("");
  const [pos,    setPos]    = useState({ top: 0, left: 0, width: 200 });
  const triggerRef  = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 220) });
    }
    setOpen(v => !v);
    setFilter("");
  }

  function select(type) {
    onChange(type);
    setOpen(false);
    setFilter("");
  }

  const filtered = filter.trim()
    ? TYPE_GROUPS
        .map(g => ({ ...g, types: g.types.filter(t => t.toLowerCase().includes(filter.toLowerCase())) }))
        .filter(g => g.types.length > 0)
    : TYPE_GROUPS;

  const showCustom = filter.trim() &&
    !SQL_TYPES.some(t => t.toLowerCase() === filter.trim().toLowerCase());

  const color = value ? typeColor(value) : "#6b7280";

  return (
    <>
      <div
        ref={triggerRef}
        onClick={handleToggle}
        style={{
          padding: "7px 10px", borderRadius: 7, cursor: "pointer",
          border: `1px solid ${open ? "rgba(96,165,250,0.45)" : "rgba(255,255,255,0.1)"}`,
          background: open ? "rgba(96,165,250,0.06)" : "rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
          userSelect: "none", transition: "border-color 0.15s",
        }}
      >
        <span style={{
          fontSize: 12.5, color,
          fontFamily: "'JetBrains Mono','Fira Code',monospace",
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {value || <span style={{ color: "#4b5563" }}>타입 선택...</span>}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5"
          style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed", top: pos.top, left: pos.left, width: pos.width,
            zIndex: 9999, background: "#1e2027",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10,
            boxShadow: "0 10px 32px rgba(0,0,0,0.5)",
            maxHeight: 300, display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* 검색 */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
            <input
              autoFocus
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && filter.trim()) select(filter.trim().toUpperCase());
              }}
              placeholder="검색 또는 직접 입력..."
              style={{
                width: "100%", padding: "5px 9px", borderRadius: 6, boxSizing: "border-box",
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
                color: "#e2e8f0", fontSize: 12, outline: "none",
                fontFamily: "'JetBrains Mono','Fira Code',monospace",
              }}
            />
          </div>

          {/* 그룹 목록 */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.map(group => (
              <div key={group.label}>
                <div style={{
                  padding: "6px 12px 2px",
                  fontSize: 10, fontWeight: 700, color: "#4b5563",
                  letterSpacing: "0.07em", textTransform: "uppercase",
                }}>{group.label}</div>
                {group.types.map(type => {
                  const tc = typeColor(type);
                  const isSelected = value === type;
                  return (
                    <div
                      key={type}
                      onClick={() => select(type)}
                      style={{
                        padding: "7px 14px", cursor: "pointer",
                        fontSize: 12.5, color: tc,
                        fontFamily: "'JetBrains Mono','Fira Code',monospace",
                        background: isSelected ? "rgba(96,165,250,0.12)" : "transparent",
                        display: "flex", alignItems: "center", gap: 8,
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? "rgba(96,165,250,0.12)" : "transparent"; }}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                      {!isSelected && <span style={{ width: 10 }} />}
                      {type}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* 직접 입력 */}
            {showCustom && (
              <div
                onClick={() => select(filter.trim().toUpperCase())}
                style={{
                  padding: "8px 14px", cursor: "pointer",
                  fontSize: 12, color: "#9ca3af",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", gap: 6,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>{`"${filter.trim().toUpperCase()}" 직접 입력`}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── 컬럼 타입 → 색상 ── */
function typeColor(type = "") {
  const t = type.toUpperCase();
  if (t.includes("BIGINT") || t.includes("INT") || t.includes("SERIAL")) return "#3b82f6";
  if (t.includes("VARCHAR") || t.includes("TEXT") || t.includes("CHAR"))  return "#10b981";
  if (t.includes("BOOL"))                                                   return "#8b5cf6";
  if (t.includes("TIMESTAMP") || t.includes("DATE") || t.includes("TIME")) return "#f59e0b";
  if (t.includes("JSON"))                                                   return "#f97316";
  if (t.includes("UUID"))                                                   return "#ec4899";
  if (t.includes("DECIMAL") || t.includes("NUMERIC") || t.includes("FLOAT")) return "#06b6d4";
  return "#9ca3af";
}

function TypeBadge({ type }) {
  const color = typeColor(type);
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, fontFamily: "monospace",
      padding: "2px 7px", borderRadius: 4,
      background: `${color}18`, border: `1px solid ${color}35`, color,
      whiteSpace: "nowrap", letterSpacing: "0.02em",
    }}>
      {type || "—"}
    </span>
  );
}

/* ── 제약조건 정규화 ──
   백엔드(dba_agent)는 제약조건을 언더스코어 토큰(PRIMARY_KEY / FOREIGN_KEY / NOT_NULL /
   DEFAULT_TRUE)으로 표준화해서 내려준다. 공백 형태로 되돌려 놓아야 PK/FK 판별과 DDL 생성이
   같은 기준으로 동작한다 — 이 변환이 없어서 ERD에 PK·FK 배지가 하나도 뜨지 않았다. */
function normConstraints(raw = "") {
  return String(raw)
    .toUpperCase()
    .replace(/PRIMARY[_\s]+KEY/g, "PRIMARY KEY")
    .replace(/FOREIGN[_\s]+KEY/g, "FOREIGN KEY")
    .replace(/NOT[_\s]+NULL/g, "NOT NULL")
    .replace(/DEFAULT[_\s]+/g, "DEFAULT ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ── 컬럼 역할 판별 ── */
function colRole(constraints = "") {
  const u = normConstraints(constraints);
  if (u.includes("PK") || u.includes("PRIMARY KEY")) return "pk";
  if (u.includes("FK") || u.includes("FOREIGN KEY")) return "fk";
  if (u.includes("UNIQUE"))                           return "uq";
  return null;
}

function RoleIcon({ role }) {
  if (role === "pk") return (
    <span title="Primary Key" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 16, height: 16, borderRadius: 3,
      background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)",
      fontSize: 9, marginRight: 5, flexShrink: 0,
    }}>🔑</span>
  );
  if (role === "fk") return (
    <span title="Foreign Key" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 16, height: 16, borderRadius: 3,
      background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)",
      fontSize: 9, marginRight: 5, flexShrink: 0,
    }}>🔗</span>
  );
  if (role === "uq") return (
    <span title="Unique" style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 16, height: 16, borderRadius: 3,
      background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)",
      fontSize: 9, marginRight: 5, flexShrink: 0,
    }}>◆</span>
  );
  return <span style={{ width: 21, display: "inline-block", flexShrink: 0 }} />;
}

function ConstraintChip({ text }) {
  if (!text) return null;
  const u = text.toUpperCase();
  let color = "#9ca3af";
  if (u.includes("NOT NULL"))                           color = "#6b7280";
  if (u.includes("DEFAULT"))                            color = "#0ea5e9";
  if (u.includes("PK") || u.includes("PRIMARY"))       color = "#f59e0b";
  if (u.includes("FK") || u.includes("FOREIGN"))       color = "#3b82f6";
  if (u.includes("UNIQUE"))                             color = "#8b5cf6";
  return (
    <span style={{
      fontSize: 10, padding: "1px 6px", borderRadius: 3,
      background: `${color}12`, border: `1px solid ${color}28`, color,
      fontFamily: "monospace", whiteSpace: "nowrap",
    }}>
      {text}
    </span>
  );
}

/* ══════════════════════════════════════
   스키마 유효성 검사
══════════════════════════════════════ */
function validateSchema(schema) {
  if (!schema) return [];
  const warnings = [];
  const tableNames = new Set((schema.tables || []).map(t => t.name));

  (schema.tables || []).forEach(t => {
    if (!t.columns?.length) return;
    const hasPk = t.columns.some(c => colRole(c.constraints) === "pk");
    if (!hasPk) warnings.push({ type: "no-pk", msg: `테이블 "${t.name}"에 PK 컬럼이 없습니다` });

    t.columns.forEach(c => {
      if (colRole(c.constraints) === "fk") {
        const ref = (c.constraints || "").match(/references?\s+(\w+)/i);
        if (ref && !tableNames.has(ref[1])) {
          warnings.push({ type: "broken-fk", msg: `${t.name}.${c.name}: FK 참조 테이블 "${ref[1]}"이 없습니다` });
        }
      }
    });
  });

  (schema.relationships || []).forEach(rel => {
    const { from, to } = parseRel(rel);
    if (from && to) {
      if (!tableNames.has(from)) warnings.push({ type: "orphan-rel", msg: `관계의 테이블 "${from}"이 스키마에 없습니다` });
      if (!tableNames.has(to))   warnings.push({ type: "orphan-rel", msg: `관계의 테이블 "${to}"이 스키마에 없습니다` });
    }
  });

  return warnings;
}

/* ── 관계 문자열 파싱 ── */
function parseRel(rel = "") {
  const m = rel.match(/^(.+?)\s*\((.+?)\)\s*(.+)$/);
  if (m) return { from: m[1].trim(), card: m[2].trim(), to: m[3].trim() };
  return { from: rel.trim(), card: null, to: null };
}

/* ── 관계 테이블명 치환 (rename 시 사용) ── */
function replaceTableInRelationships(relationships, oldName, newName) {
  return relationships.map(rel => {
    const { from, card, to } = parseRel(rel);
    if (!card) return rel;
    const f = from === oldName ? newName : from;
    const t = to   === oldName ? newName : to;
    return `${f} (${card}) ${t}`;
  });
}

/* ══════════════════════════════════════
   경고 배너
══════════════════════════════════════ */
function WarningBanner({ warnings }) {
  const [expanded, setExpanded] = useState(false);
  if (!warnings.length) return null;
  return (
    <div style={{
      borderRadius: 10, border: "1px solid rgba(245,158,11,0.3)",
      background: "rgba(245,158,11,0.05)", marginBottom: 14,
      overflow: "hidden",
    }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "9px 14px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#d97706", flex: 1 }}>
          스키마 경고 {warnings.length}개 — 저장은 되지만 검토가 필요합니다
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="#d97706" strokeWidth="2.5"
          style={{ transition: "transform 0.15s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {expanded && (
        <div style={{ padding: "0 14px 12px 14px", borderTop: "1px solid rgba(245,158,11,0.15)" }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "5px 0",
              borderBottom: i < warnings.length - 1 ? "1px solid rgba(245,158,11,0.1)" : "none" }}>
              <span style={{ fontSize: 11, color: "#92400e", marginTop: 1, flexShrink: 0 }}>
                {w.type === "no-pk" ? "🔑" : w.type === "broken-fk" ? "🔗" : "🔀"}
              </span>
              <span style={{ fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>{w.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   관계 편집 드로어
══════════════════════════════════════ */
function RelationshipEditDrawer({ initial, isNew, tableNames, onSave, onCancel, saving }) {
  const parsed  = initial ? parseRel(initial) : { from: "", card: "1:N", to: "" };
  const [from,   setFrom]   = useState(parsed.from || "");
  const [card,   setCard]   = useState(parsed.card || "1:N");
  const [to,     setTo]     = useState(parsed.to   || "");
  const [errors, setErrors] = useState({});

  function handleSubmit() {
    const errs = {};
    if (!from) errs.from = "시작 테이블을 선택하세요";
    if (!to)   errs.to   = "끝 테이블을 선택하세요";
    if (from && to && from === to) errs.to = "서로 다른 테이블을 선택하세요";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(`${from} (${card}) ${to}`);
  }

  const selStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
    color: "#e2e8f0", fontSize: 13, outline: "none", cursor: "pointer",
    fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    paddingRight: 32,
  };
  const lbl = {
    fontSize: 11, fontWeight: 700, color: "#9ca3af",
    letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, display: "block",
  };

  const ci = CARD_INFO[card];

  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, width: 480, height: "100vh",
        background: "#16181c", zIndex: 201, display: "flex", flexDirection: "column",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      }}>
        {/* 헤더 */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>
            {isNew ? "관계 추가" : "관계 수정"}
          </span>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {/* 폼 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* 미리보기 */}
          {from && to && (
            <div style={{
              padding: "12px 16px", borderRadius: 10, marginBottom: 24,
              background: "rgba(107,105,96,0.08)", border: "1px solid rgba(107,105,96,0.15)",
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            }}>
              <code style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace",
                background: "rgba(255,255,255,0.06)", padding: "3px 9px", borderRadius: 5 }}>{from}</code>
              {(() => { const { bg, bd, c } = cardColor(card); return (
                <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 10px", borderRadius: 5,
                  background: bg, border: `1px solid ${bd}`, color: c }}>{card}</span>
              );})()}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
              <code style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", fontFamily: "monospace",
                background: "rgba(255,255,255,0.06)", padding: "3px 9px", borderRadius: 5 }}>{to}</code>
            </div>
          )}

          {/* 시작 테이블 */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>시작 테이블</label>
            <select
              value={from}
              onChange={e => { setFrom(e.target.value); setErrors(p => ({ ...p, from: "" })); }}
              style={{ ...selStyle, borderColor: errors.from ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)" }}
            >
              <option value="">테이블 선택...</option>
              {tableNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {errors.from && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{errors.from}</div>}
          </div>

          {/* 카디널리티 */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>관계 유형</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
              {CARDINALITIES.map(c => {
                const { bg, bd, c: col } = cardColor(c);
                const isActive = card === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCard(c)}
                    style={{
                      padding: "10px 4px", borderRadius: 8, fontSize: 13, fontWeight: 800,
                      cursor: "pointer", transition: "all 0.15s",
                      background: isActive ? bg : "rgba(255,255,255,0.03)",
                      border: `2px solid ${isActive ? bd : "rgba(255,255,255,0.08)"}`,
                      color: isActive ? col : "#6b7280",
                    }}
                  >{c}</button>
                );
              })}
            </div>
            {ci && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: "#9ca3af" }}>{ci.label}</span> — {ci.desc}
              </div>
            )}
          </div>

          {/* 끝 테이블 */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>끝 테이블</label>
            <select
              value={to}
              onChange={e => { setTo(e.target.value); setErrors(p => ({ ...p, to: "" })); }}
              style={{ ...selStyle, borderColor: errors.to ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)" }}
            >
              <option value="">테이블 선택...</option>
              {tableNames.filter(n => n !== from).map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {errors.to && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{errors.to}</div>}
          </div>
        </div>

        {/* 푸터 */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0,
        }}>
          <button onClick={onCancel} style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#9ca3af", cursor: "pointer",
          }}>취소</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            padding: "7px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.35)",
            color: "#60a5fa", cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "저장 중..." : isNew ? "추가" : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   테이블 편집 드로어
══════════════════════════════════════ */
function TableEditDrawer({ initial, isNew, onSave, onCancel, saving }) {
  const [tableName, setTableName] = useState(initial?.name || "");
  const [columns,   setColumns]   = useState(() =>
    Array.isArray(initial?.columns) && initial.columns.length
      ? initial.columns.map(c => ({ name: c.name || "", type: c.type || "", constraints: c.constraints || "" }))
      : [{ name: "id", type: "BIGINT", constraints: "PK, NOT NULL" }]
  );
  const [indexes,   setIndexes]   = useState(() =>
    Array.isArray(initial?.indexes) ? [...initial.indexes] : []
  );
  const [errors,    setErrors]    = useState({});

  function addColumn() {
    setColumns(cols => [...cols, { name: "", type: "VARCHAR(255)", constraints: "" }]);
  }
  function removeColumn(i) { setColumns(cols => cols.filter((_, j) => j !== i)); }
  function setCol(i, key, val) { setColumns(cols => cols.map((c, j) => j === i ? { ...c, [key]: val } : c)); }

  function addIndex() { setIndexes(idxs => [...idxs, ""]); }
  function removeIndex(i) { setIndexes(idxs => idxs.filter((_, j) => j !== i)); }
  function setIndexVal(i, val) { setIndexes(idxs => idxs.map((v, j) => j === i ? val : v)); }

  function appendConstraint(chip) {
    const last = columns.length - 1;
    if (last < 0) addColumn();
    else {
      const cur = columns[last].constraints;
      setCol(last, "constraints", cur ? `${cur}, ${chip}` : chip);
    }
  }

  function handleSubmit() {
    const errs = {};
    if (!tableName.trim()) errs.name = "테이블명을 입력하세요";
    const blankCol = columns.findIndex(c => !c.name.trim());
    if (blankCol >= 0) errs.cols = `컬럼 ${blankCol + 1}번: 컬럼명이 비어있습니다`;
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave({
      name: tableName.trim(),
      columns: columns
        .filter(c => c.name.trim())
        .map(c => ({ name: c.name.trim(), type: c.type.trim() || "VARCHAR(255)", constraints: c.constraints.trim() })),
      indexes: indexes.filter(i => i.trim()),
    });
  }

  const inp = {
    padding: "7px 10px", borderRadius: 7,
    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)",
    color: "#e2e8f0", fontSize: 12.5, outline: "none", boxSizing: "border-box",
    fontFamily: "'JetBrains Mono','Fira Code',monospace",
  };
  const lbl = {
    fontSize: 11, fontWeight: 700, color: "#9ca3af",
    letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, display: "block",
  };
  const CHIPS = ["PK", "FK", "NOT NULL", "UNIQUE", "DEFAULT now()", "AUTO_INCREMENT"];

  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, width: 620, height: "100vh",
        background: "#16181c", zIndex: 201, display: "flex", flexDirection: "column",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "-12px 0 40px rgba(0,0,0,0.5)",
        fontFamily: "'Pretendard','Noto Sans KR',sans-serif",
      }}>
        {/* 헤더 */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>
            {isNew ? "테이블 추가" : "테이블 수정"}
          </span>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20 }}>×</button>
        </div>

        {/* 폼 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* 테이블명 */}
          <div style={{ marginBottom: 22 }}>
            <label style={lbl}>테이블명</label>
            <input
              value={tableName}
              onChange={e => { setTableName(e.target.value); setErrors(p => ({ ...p, name: "" })); }}
              placeholder="table_name"
              style={{
                ...inp, width: "100%",
                borderColor: errors.name ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)",
              }}
            />
            {errors.name && <div style={{ fontSize: 11, color: "#f87171", marginTop: 4 }}>{errors.name}</div>}
          </div>

          {/* 컬럼 */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ ...lbl, marginBottom: 0 }}>컬럼 ({columns.length})</label>
              <button onClick={addColumn} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 5,
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                color: "#34d399", cursor: "pointer",
              }}>+ 추가</button>
            </div>

            {/* 컬럼 헤더 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr 20px", gap: 6, marginBottom: 4, padding: "0 2px" }}>
              {["컬럼명", "타입", "제약조건", ""].map((h, i) => (
                <span key={i} style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
              ))}
            </div>

            {columns.map((col, i) => {
              const role = colRole(col.constraints);
              const rowBg = role === "pk"
                ? "rgba(245,158,11,0.07)"
                : role === "fk" ? "rgba(59,130,246,0.05)" : "transparent";
              return (
                <div key={i} style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr 20px",
                  gap: 6, marginBottom: 6, alignItems: "center",
                  background: rowBg, borderRadius: 6, padding: "3px 4px",
                }}>
                  <input
                    value={col.name}
                    onChange={e => { setCol(i, "name", e.target.value); setErrors(p => ({ ...p, cols: "" })); }}
                    placeholder="column_name"
                    style={{
                      ...inp, width: "100%",
                      borderColor: errors.cols && !col.name.trim() ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)",
                    }}
                  />
                  <CustomTypeSelect
                    value={col.type}
                    onChange={v => setCol(i, "type", v)}
                  />
                  <input
                    value={col.constraints}
                    onChange={e => setCol(i, "constraints", e.target.value)}
                    placeholder="PK, NOT NULL"
                    style={{ ...inp, width: "100%" }}
                  />
                  <button onClick={() => removeColumn(i)} style={{
                    background: "none", border: "none", color: "#6b7280",
                    cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
                  }}>×</button>
                </div>
              );
            })}

            {/* 제약조건 빠른 입력 */}
            <div style={{ marginTop: 10, display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#6b7280" }}>마지막 컬럼에 추가:</span>
              {CHIPS.map(chip => (
                <button key={chip} onClick={() => appendConstraint(chip)} style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4,
                  background: "rgba(107,105,96,0.1)", border: "1px solid rgba(107,105,96,0.2)",
                  color: "#9ca3af", cursor: "pointer",
                }}>{chip}</button>
              ))}
            </div>
            {errors.cols && <div style={{ fontSize: 11, color: "#f87171", marginTop: 6 }}>{errors.cols}</div>}
          </div>

          {/* 인덱스 */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ ...lbl, marginBottom: 0 }}>인덱스</label>
              <button onClick={addIndex} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 5,
                background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.3)",
                color: "#fb923c", cursor: "pointer",
              }}>+ 추가</button>
            </div>
            {indexes.length === 0 && (
              <div style={{ fontSize: 12, color: "#4b5563" }}>인덱스 없음</div>
            )}
            {indexes.map((idx, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                <input
                  value={idx}
                  onChange={e => setIndexVal(i, e.target.value)}
                  placeholder={`idx_${tableName || "table"}_column`}
                  style={{ ...inp, flex: 1 }}
                />
                <button onClick={() => removeIndex(i)} style={{
                  background: "none", border: "none", color: "#6b7280",
                  cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0,
                }}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div style={{
          padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0,
        }}>
          <button onClick={onCancel} style={{
            padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#9ca3af", cursor: "pointer",
          }}>취소</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            padding: "7px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.35)",
            color: "#34d399", cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "저장 중..." : isNew ? "추가" : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   테이블 카드 (편집/삭제 버튼 포함)
══════════════════════════════════════ */
function TableCard({ table, defaultOpen, canEdit, onEdit, onDelete }) {
  const [open, setOpen] = useState(defaultOpen);

  const pkCols = (table.columns || []).filter(c => colRole(c.constraints) === "pk");
  const fkCount = (table.columns || []).filter(c => colRole(c.constraints) === "fk").length;
  const warnings = [];
  if (!pkCols.length && table.columns?.length > 0) warnings.push("PK 없음");

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${open ? "rgba(107,105,96,0.18)" : C.border}`,
      background: C.card,
      marginBottom: 12,
      overflow: "hidden",
      boxShadow: open ? "0 1px 6px rgba(0,0,0,0.05)" : "none",
      transition: "box-shadow 0.15s",
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", background: "none", border: "none",
            cursor: "pointer", textAlign: "left",
            borderBottom: open ? `1px solid ${C.border}` : "none",
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
          }}>⊞</div>

          <code style={{
            flex: 1, fontSize: 13, fontWeight: 700, color: C.text,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}>
            {table.name}
          </code>

          {warnings.length > 0 && (
            <span title={warnings.join(", ")} style={{
              fontSize: 10, padding: "2px 7px", borderRadius: 4,
              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
              color: "#d97706", fontWeight: 700,
            }}>⚠️ {warnings.join(", ")}</span>
          )}

          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {pkCols.length > 0 && (
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 4,
                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                color: "#d97706", fontWeight: 600,
              }}>PK: {pkCols.map(c => c.name).join(", ")}</span>
            )}
            {fkCount > 0 && (
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 4,
                background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                color: "#2563eb", fontWeight: 600,
              }}>FK {fkCount}</span>
            )}
            <span style={{
              fontSize: 10, color: C.muted, padding: "2px 8px", borderRadius: 10,
              background: "rgba(0,0,0,0.04)", fontWeight: 500,
            }}>{table.columns?.length ?? 0}컬럼</span>
          </div>

          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={C.muted} strokeWidth="2.5" strokeLinecap="round"
            style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* 편집/삭제 버튼 */}
        {canEdit && (
          <div style={{
            display: "flex", gap: 4, padding: "0 12px", flexShrink: 0,
            borderBottom: open ? `1px solid ${C.border}` : "none",
            alignSelf: "stretch", alignItems: "center",
          }}>
            <button
              onClick={() => onEdit(table)}
              title="편집"
              style={{
                padding: "5px 8px", borderRadius: 6,
                background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
                color: "#fbbf24", cursor: "pointer",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button
              onClick={() => onDelete(table)}
              title="삭제"
              style={{
                padding: "5px 8px", borderRadius: 6,
                background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                color: "#f87171", cursor: "pointer",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 컬럼 목록 */}
      {open && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.025)" }}>
                {[{ w: "38%", label: "컬럼명" }, { w: "20%", label: "타입" }, { w: "42%", label: "제약조건" }].map(h => (
                  <th key={h.label} style={{
                    padding: "7px 16px", textAlign: "left", width: h.w,
                    fontSize: 10, fontWeight: 700, color: C.sub,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    borderBottom: `1px solid ${C.border}`,
                  }}>{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(table.columns || []).map((col, i) => {
                const role = colRole(col.constraints);
                const isPk = role === "pk";
                const isFk = role === "fk";
                return (
                  <tr key={i} style={{
                    background: isPk ? "rgba(245,158,11,0.04)" : isFk ? "rgba(59,130,246,0.03)" : "transparent",
                    borderBottom: i < table.columns.length - 1 ? `1px solid ${C.border}` : "none",
                    transition: "background 0.1s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = isPk
                      ? "rgba(245,158,11,0.08)" : isFk ? "rgba(59,130,246,0.06)" : "rgba(0,0,0,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = isPk
                      ? "rgba(245,158,11,0.04)" : isFk ? "rgba(59,130,246,0.03)" : "transparent"}
                  >
                    <td style={{ padding: "9px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <RoleIcon role={role} />
                        <code style={{
                          fontSize: 12, fontWeight: isPk ? 700 : 500,
                          color: isPk ? "#92400e" : isFk ? "#1d4ed8" : C.text,
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                        }}>{col.name}</code>
                      </div>
                    </td>
                    <td style={{ padding: "9px 16px" }}>
                      <TypeBadge type={col.type} />
                    </td>
                    <td style={{ padding: "9px 16px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(col.constraints || "").split(",").map(c => c.trim()).filter(Boolean).map((c, j) => (
                          <ConstraintChip key={j} text={c} />
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {table.indexes?.length > 0 && (
            <div style={{ padding: "9px 16px 12px", borderTop: `1px solid ${C.border}`, background: "rgba(0,0,0,0.01)" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 8 }}>
                인덱스
              </span>
              <div style={{ display: "inline-flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>
                {table.indexes.map((idx, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontFamily: "monospace",
                    padding: "2px 8px", borderRadius: 4,
                    background: C.codeBg, border: `1px solid ${C.border}`, color: C.accent,
                  }}>{idx}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   관계 섹션 (인라인 CRUD)
══════════════════════════════════════ */
function cardColor(card = "") {
  if (card.includes("1:1"))              return { bg: "rgba(139,92,246,0.1)",  bd: "rgba(139,92,246,0.3)",  c: "#7c3aed" };
  if (card.includes("1:N") || card.includes("N:1")) return { bg: "rgba(59,130,246,0.1)",  bd: "rgba(59,130,246,0.3)",  c: "#2563eb" };
  if (card.includes("N:M") || card.includes("M:N")) return { bg: "rgba(236,72,153,0.1)",  bd: "rgba(236,72,153,0.3)",  c: "#db2777" };
  return { bg: "rgba(107,105,96,0.08)", bd: "rgba(107,105,96,0.2)", c: "#6b6960" };
}

function RelationshipsSection({ relationships, canEdit, onAdd, onEdit, onDelete }) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [hoveredIdx,  setHoveredIdx]  = useState(null);

  return (
    <div style={{
      borderRadius: 12, border: `1px solid ${C.border}`,
      background: C.card, marginBottom: 16, overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", background: "none", border: "none",
            cursor: "pointer", textAlign: "left",
            borderBottom: collapsed ? "none" : `1px solid ${C.border}`,
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            background: "rgba(107,105,96,0.08)", border: "1px solid rgba(107,105,96,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
          }}>⟷</div>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.text }}>테이블 관계</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {["1:1","1:N","N:M"].map(k => {
              const { bg, bd, c } = cardColor(k);
              return (
                <span key={k} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: bg, border: `1px solid ${bd}`, color: c, fontWeight: 700 }}>{k}</span>
              );
            })}
            <span style={{ fontSize: 10, color: C.muted, padding: "2px 8px", borderRadius: 10, background: "rgba(0,0,0,0.04)", fontWeight: 500 }}>
              {(relationships || []).length}개
            </span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke={C.muted} strokeWidth="2.5" strokeLinecap="round"
            style={{ flexShrink: 0, transition: "transform 0.15s", transform: collapsed ? "rotate(0deg)" : "rotate(180deg)" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        {canEdit && !collapsed && (
          <button
            onClick={onAdd}
            style={{
              marginRight: 14, padding: "5px 12px", borderRadius: 6,
              fontSize: 11, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap",
              background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.25)",
              color: "#60a5fa", cursor: "pointer",
            }}
          >+ 관계 추가</button>
        )}
      </div>

      {!collapsed && (
        <div style={{ padding: "8px 16px 14px" }}>
          {!(relationships || []).length && (
            <div style={{ fontSize: 12, color: C.sub, padding: "4px 0" }}>관계 정보 없음</div>
          )}
          {(relationships || []).map((rel, i) => {
            const { from, card, to } = parseRel(rel);
            const cs      = cardColor(card || "");
            const isHover = hoveredIdx === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 6px", borderRadius: 6,
                  borderBottom: i < relationships.length - 1 ? `1px solid ${C.border}` : "none",
                  background: isHover ? "rgba(0,0,0,0.025)" : "transparent",
                  transition: "background 0.1s",
                }}
              >
                {card ? (
                  <>
                    <code style={{
                      fontSize: 12, fontWeight: 600, color: C.text,
                      fontFamily: "monospace", background: C.codeBg,
                      padding: "2px 7px", borderRadius: 4,
                    }}>{from}</code>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                      background: cs.bg, border: `1px solid ${cs.bd}`, color: cs.c,
                      whiteSpace: "nowrap",
                    }}>{card}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                      <path d="M5 12h14M13 6l6 6-6 6"/>
                    </svg>
                    <code style={{
                      fontSize: 12, fontWeight: 600, color: C.text,
                      fontFamily: "monospace", background: C.codeBg,
                      padding: "2px 7px", borderRadius: 4, flex: 1,
                    }}>{to}</code>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, flex: 1 }}>{rel}</span>
                )}
                {canEdit && (
                  <div style={{
                    display: "flex", gap: 4, flexShrink: 0,
                    opacity: isHover ? 1 : 0,
                    transition: "opacity 0.15s",
                    pointerEvents: isHover ? "auto" : "none",
                  }}>
                    <button onClick={() => onEdit(i)} style={{
                      padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                      background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
                      color: "#fbbf24", cursor: "pointer",
                    }}>편집</button>
                    <button onClick={() => onDelete(i)} style={{
                      padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                      background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                      color: "#f87171", cursor: "pointer",
                    }}>삭제</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 통계 요약 ── */
function SchemaSummary({ schema }) {
  const colCount = schema.tables.reduce((s, t) => s + (t.columns?.length ?? 0), 0);
  const pkCount  = schema.tables.reduce((s, t) => s + (t.columns||[]).filter(c => colRole(c.constraints) === "pk").length, 0);
  const fkCount  = schema.tables.reduce((s, t) => s + (t.columns||[]).filter(c => colRole(c.constraints) === "fk").length, 0);
  const idxCount = schema.tables.reduce((s, t) => s + (t.indexes?.length ?? 0), 0);
  const stats = [
    { label: "테이블", value: schema.tables.length, color: "#34d399" },
    { label: "컬럼",   value: colCount,              color: "#60a5fa" },
    { label: "PK",     value: pkCount,               color: "#f59e0b" },
    { label: "FK",     value: fkCount,               color: "#818cf8" },
    { label: "인덱스", value: idxCount,              color: "#fb923c" },
    { label: "관계",   value: schema.relationships?.length ?? 0, color: "#ec4899" },
  ];
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
      {stats.map(s => (
        <div key={s.label} style={{
          flex: "1 1 70px", borderRadius: 10, border: `1px solid ${C.border}`,
          background: C.card, padding: "10px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: 10, color: C.sub, marginTop: 3, fontWeight: 600, letterSpacing: "0.04em" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── DB 스키마 → 텍스트 ── */
function schemaToText(schema) {
  if (!schema?.tables?.length) return "";
  return schema.tables.map(t => {
    const cols = (t.columns || []).map(c => `  ${c.name} ${c.type} ${c.constraints || ""}`).join("\n");
    return `TABLE ${t.name}:\n${cols}`;
  }).join("\n\n");
}

/* ── DB 스키마 → SQL DDL ── */
function schemaToSql(schema) {
  if (!schema?.tables?.length) return "";
  const lines = [];
  schema.tables.forEach((table, ti) => {
    if (ti > 0) lines.push("");
    lines.push(`CREATE TABLE ${table.name} (`);
    const cols = table.columns || [];
    cols.forEach((col, ci) => {
      const u = normConstraints(col.constraints);
      const isPk = u.includes("PK") || u.includes("PRIMARY KEY");
      const isFk = u.includes("FK") || u.includes("FOREIGN KEY");
      const tokens = [col.name, col.type];
      if (!isPk && u.includes("NOT NULL")) tokens.push("NOT NULL");
      if (u.includes("UNIQUE")) tokens.push("UNIQUE");
      if (isPk) tokens.push("PRIMARY KEY");
      if (u.includes("AUTO_INCREMENT")) tokens.push("AUTO_INCREMENT");
      const defMatch = u.match(/DEFAULT\s+(\S+)/);
      if (defMatch) tokens.push(`DEFAULT ${defMatch[1]}`);
      const comment = isFk ? "  -- FK" : "";
      const comma = ci < cols.length - 1 ? "," : "";
      lines.push(`  ${tokens.join(" ")}${comma}${comment}`);
    });
    lines.push(");");
    (table.indexes || []).forEach(idx => {
      lines.push(`CREATE INDEX ${idx} ON ${table.name};`);
    });
  });
  if (schema.relationships?.length) {
    lines.push(""); lines.push("-- Relationships");
    schema.relationships.forEach(rel => lines.push(`-- ${rel}`));
  }
  return lines.join("\n");
}

/* ── SQL 모달 ── */
function SqlModal({ sql, onClose }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(sql); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = sql; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [sql]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 800, maxHeight: "80vh",
        background: "#1a1b1e", borderRadius: 14, display: "flex", flexDirection: "column",
        overflow: "hidden", boxShadow: "0 24px 72px rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "13px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
          }}>⊞</div>
          <span style={{ color: "#e5e7eb", fontSize: 13, fontWeight: 600 }}>SQL DDL</span>
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 4,
            background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)",
            color: "#34d399", fontWeight: 600,
          }}>CREATE TABLE</span>
          <div style={{ flex: 1 }} />
          <button onClick={handleCopy} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: copied ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.07)",
            border: `1px solid ${copied ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.12)"}`,
            color: copied ? "#34d399" : "#d1d5db", cursor: "pointer", transition: "all 0.15s",
          }}>
            {copied ? "복사됨" : "복사"}
          </button>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "#9ca3af", cursor: "pointer", fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <pre style={{
            margin: 0, padding: "20px 24px",
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
            fontSize: 13, lineHeight: 1.75, color: "#e2e8f0",
            whiteSpace: "pre", overflowX: "auto",
          }}>{sql}</pre>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   ERD PANEL
══════════════════════════════════════ */
export function ErdPanel({ project, readOnly = false }) {
  const [search,        setSearch]        = useState("");
  const [expandAll,     setExpandAll]     = useState(null);
  const [showSql,       setShowSql]       = useState(false);
  const [localSchema,   setLocalSchema]   = useState(null);
  const [editingTable,        setEditingTable]        = useState(null); // null | { table: {...}|null, isNew: bool }
  const [editingRelationship, setEditingRelationship] = useState(null); // null | { idx: number|"new", raw: string|null }
  const [opSaving,            setOpSaving]            = useState(false);
  const [saved,               setSaved]               = useState(false);

  useEffect(() => { setLocalSchema(null); }, [project?.id]);

  const schema = useMemo(() => {
    const s = localSchema ?? project?.dbSchema;
    if (!s || typeof s !== "object") return null;
    if (!Array.isArray(s.tables) || s.tables.length === 0) return null;
    return s;
  }, [project, localSchema]);

  const warnings = useMemo(() => validateSchema(schema), [schema]);
  const canEdit  = !readOnly && !!project?.artifactIds?.DB_SCHEMA;

  /* ── 공통 저장 ── */
  async function persistSchema(newSchema) {
    const artifactId = project?.artifactIds?.DB_SCHEMA;
    if (!artifactId) return;
    await updateArtifact(artifactId, JSON.stringify(newSchema));
    setLocalSchema(newSchema);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  /* ── AI 수정안 적용 ──
     승인된 섹션(tables / relationships)만 갈아끼우고 곧바로 저장한다. 저장 실패는
     예외로 올려보내 사이드바가 '적용 실패'로 알리게 한다. */
  async function handleApplyEdits(edits) {
    const artifactId = project?.artifactIds?.DB_SCHEMA;
    if (!artifactId) {
      throw new Error("저장 대상 ERD를 찾을 수 없습니다. 문서를 다시 불러온 뒤 시도해 주세요.");
    }
    const nextSchema = { ...(schema || { tables: [], relationships: [] }) };
    edits.forEach(e => { nextSchema[e.section] = e.after; });
    await persistSchema(nextSchema);
  }

  /* ── 테이블 추가 ── */
  function handleAddTable() {
    setEditingTable({ table: null, isNew: true });
  }

  /* ── 테이블 편집 열기 ── */
  function handleEditTable(table) {
    setEditingTable({ table, isNew: false });
  }

  /* ── 테이블 삭제 (관계 연쇄 처리) ── */
  async function handleDeleteTable(table) {
    const currentSchema = schema ?? { tables: [], relationships: [] };
    const name = table.name;

    const affected = (currentSchema.relationships || []).filter(rel => {
      const { from, to } = parseRel(rel);
      return from === name || to === name;
    });

    const msg = affected.length > 0
      ? `테이블 "${name}"을 삭제할까요?\n\n아래 관계도 함께 삭제됩니다:\n${affected.map(r => `• ${r}`).join("\n")}`
      : `테이블 "${name}"을 삭제할까요?`;

    if (!window.confirm(msg)) return;

    const tables = currentSchema.tables.filter(t => t.name !== name);
    const relationships = (currentSchema.relationships || []).filter(rel => {
      const { from, to } = parseRel(rel);
      return from !== name && to !== name;
    });

    setOpSaving(true);
    try {
      await persistSchema({ ...currentSchema, tables, relationships });
    } catch (e) {
      alert("삭제 실패: " + e.message);
    } finally {
      setOpSaving(false);
    }
  }

  /* ── 테이블 저장 (rename 시 관계 자동 치환) ── */
  async function handleSaveTable(data) {
    const currentSchema = schema ?? { tables: [], relationships: [] };
    const tables = [...(currentSchema.tables || [])];
    let relationships = [...(currentSchema.relationships || [])];

    if (editingTable.isNew) {
      tables.push(data);
    } else {
      const oldName = editingTable.table?.name;
      const newName = data.name;

      // 이름이 변경된 경우 관계 자동 치환
      if (oldName && oldName !== newName) {
        relationships = replaceTableInRelationships(relationships, oldName, newName);
      }

      const idx = tables.findIndex(t => t.name === oldName);
      if (idx >= 0) tables[idx] = data;
      else tables.push(data);
    }

    setOpSaving(true);
    try {
      await persistSchema({ ...currentSchema, tables, relationships });
      setEditingTable(null);
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setOpSaving(false);
    }
  }

  /* ── 관계 드로어 열기 ── */
  function handleOpenAddRelationship() {
    setEditingRelationship({ idx: "new", raw: null });
  }
  function handleOpenEditRelationship(idx) {
    setEditingRelationship({ idx, raw: (schema?.relationships || [])[idx] ?? null });
  }

  /* ── 관계 드로어 저장 ── */
  async function handleSaveRelationship(relStr) {
    const currentSchema = schema ?? { tables: [], relationships: [] };
    const rels = [...(currentSchema.relationships || [])];
    if (editingRelationship.idx === "new") {
      rels.push(relStr);
    } else {
      rels[editingRelationship.idx] = relStr;
    }
    setOpSaving(true);
    try {
      await persistSchema({ ...currentSchema, relationships: rels });
      setEditingRelationship(null);
    } catch (e) { alert("저장 실패: " + e.message); }
    finally { setOpSaving(false); }
  }

  /* ── 관계 삭제 ── */
  async function handleDeleteRelationship(idx) {
    if (!window.confirm("이 관계를 삭제할까요?")) return;
    const currentSchema = schema ?? { tables: [], relationships: [] };
    const relationships = (currentSchema.relationships || []).filter((_, i) => i !== idx);
    setOpSaving(true);
    try { await persistSchema({ ...currentSchema, relationships }); }
    catch (e) { alert("저장 실패: " + e.message); }
    finally { setOpSaving(false); }
  }

  const filteredTables = useMemo(() => {
    if (!schema) return [];
    if (!search) return schema.tables;
    const q = search.toLowerCase();
    return schema.tables.filter(t =>
      t.name?.toLowerCase().includes(q) ||
      t.columns?.some(c => c.name?.toLowerCase().includes(q))
    );
  }, [schema, search]);

  const tableNames     = useMemo(() => (schema?.tables || []).map(t => t.name), [schema]);
  const currentContent = useMemo(() => schemaToText(schema), [schema]);
  const sqlCode        = useMemo(() => schemaToSql(schema),  [schema]);

  return (
    <div style={{
      flex: 1, display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* 테이블 드로어 */}
      {editingTable && (
        <TableEditDrawer
          initial={editingTable.table}
          isNew={editingTable.isNew}
          onSave={handleSaveTable}
          onCancel={() => setEditingTable(null)}
          saving={opSaving}
        />
      )}

      {/* 관계 드로어 */}
      {editingRelationship && (
        <RelationshipEditDrawer
          initial={editingRelationship.raw}
          isNew={editingRelationship.idx === "new"}
          tableNames={tableNames}
          onSave={handleSaveRelationship}
          onCancel={() => setEditingRelationship(null)}
          saving={opSaving}
        />
      )}

      {/* ── 왼쪽 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* 헤더 */}
        <div style={{
          height: 52, flexShrink: 0, borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", padding: "0 20px", gap: 10,
          background: C.surface,
        }}>
          {project && (
            <>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: `${project.color || "var(--text-1)"}22`,
                border: `1px solid ${project.color || "var(--text-1)"}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 900, color: project.color || "#6b6960",
              }}>{(project.name || "P").charAt(0).toUpperCase()}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{project.name}</span>
              <span style={{ fontSize: 13, color: C.sub }}>›</span>
            </>
          )}
          <span style={{
            fontSize: 12, fontWeight: 600, color: "#34d399",
            padding: "2px 8px", borderRadius: 6,
            background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
          }}>ERD 명세서</span>

          <div style={{ flex: 1 }} />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {project?.id && <ConsistencyBadge projectId={project.id} areaKeyword="DB" />}
            {saved && (
              <span style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 5,
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
                color: "#34d399", fontWeight: 600,
              }}>✓ 저장됨</span>
            )}
            {warnings.length > 0 && (
              <span style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 5,
                background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                color: "#d97706", fontWeight: 600,
              }}>⚠️ {warnings.length}</span>
            )}
            {schema && (
              <>
                <button onClick={() => setShowSql(true)} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 11px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                  background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)",
                  color: "#34d399", cursor: "pointer",
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                  SQL 보기
                </button>
                <button onClick={() => setExpandAll(v => v === true ? false : true)} style={{
                  padding: "5px 11px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                  background: "none", border: `1px solid ${C.border}`,
                  color: C.accent, cursor: "pointer",
                }}>{expandAll === false ? "전체 펼치기" : "전체 접기"}</button>
              </>
            )}
            {canEdit && (
              <button onClick={handleAddTable} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.35)",
                color: "#34d399", cursor: "pointer",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                테이블 추가
              </button>
            )}
          </div>
        </div>

        {/* 검색 바 */}
        {schema && (
          <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
            <div style={{ position: "relative", maxWidth: 340 }}>
              <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }}
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.sub} strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="테이블·컬럼 검색..."
                style={{
                  width: "100%", padding: "7px 12px 7px 26px",
                  background: "var(--bg)", border: `1px solid ${C.border}`,
                  borderRadius: 8, fontSize: 12, color: C.text, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        )}

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {!schema ? (
            <EmptyState canEdit={canEdit} onAdd={handleAddTable} />
          ) : (
            <div style={{ maxWidth: 860, margin: "0 auto", padding: "22px 24px 60px" }}>
              <WarningBanner warnings={warnings} />
              {!search && <SchemaSummary schema={schema} />}
              {!search && (
                <RelationshipsSection
                  relationships={schema.relationships}
                  canEdit={canEdit}
                  onAdd={handleOpenAddRelationship}
                  onEdit={handleOpenEditRelationship}
                  onDelete={handleDeleteRelationship}
                />
              )}
              {filteredTables.length > 0
                ? filteredTables.map((t, i) => (
                    <TableCard
                      key={`${t.name}-${i}`}
                      table={t}
                      defaultOpen={expandAll !== null ? expandAll : i < 3}
                      canEdit={canEdit}
                      onEdit={handleEditTable}
                      onDelete={handleDeleteTable}
                    />
                  ))
                : schema && search && (
                  <div style={{ textAlign: "center", padding: "60px 0", color: C.sub, fontSize: 14 }}>
                    검색 결과가 없습니다
                  </div>
                )
              }
            </div>
          )}
        </div>
      </div>

      {/* ── 오른쪽: AI 채팅 ── */}
      <AiChatDock
        contextType="erd"
        project={project}
        currentContent={currentContent}
        document={canEdit && schema ? schema : null}
        onApplyEdits={canEdit && schema ? handleApplyEdits : undefined}
      />

      {showSql && sqlCode && (
        <SqlModal sql={sqlCode} onClose={() => setShowSql(false)} />
      )}
    </div>
  );
}

function EmptyState({ canEdit, onAdd }) {
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
          파이프라인을 실행하거나 직접 테이블을 추가하세요
        </div>
      </div>
      {canEdit && (
        <button onClick={onAdd} style={{
          padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.35)",
          color: "#34d399", cursor: "pointer",
        }}>+ 첫 번째 테이블 추가</button>
      )}
    </div>
  );
}
