"use client";

/**
 * FeaturesPanel.jsx
 * -----------------
 * 기능 명세서 패널 + AI 채팅 사이드바.
 *
 * 데이터 우선순위:
 *   1순위: project.prdDocument.coreFeatures  (PRD 에이전트 상세 기능)
 *   2순위: project.featureList               (PM 에이전트 기능 목록)
 *   3순위: 빈 상태 안내
 */

import { useState, useMemo } from "react";
import { AiChatSidebar } from "./AiChatSidebar";
import { DocumentSyncBadge, getDocumentSyncStatus } from "./DocumentSyncBadge";

const C = {
  bg:        "var(--surface)",
  surface:   "#f7f6f3",
  border:    "rgba(0,0,0,0.07)",
  text:      "#1a1916",
  muted:     "var(--text-3)",
  sub:       "var(--text-3)",
  accent:    "#6b6960",
  accentBg:  "rgba(107,105,96,0.1)",
  accentBdr: "rgba(107,105,96,0.25)",
  card:      "var(--surface)",
};

/* ── 우선순위 배지 ── */
const PRIORITY_META = {
  P0: { label: "P0 · Must",   bg: "rgba(248,113,113,0.1)",  border: "rgba(248,113,113,0.3)",  text: "#f87171" },
  P1: { label: "P1 · Should", bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.3)",   text: "#fbbf24" },
  P2: { label: "P2 · Could",  bg: "rgba(52,211,153,0.1)",   border: "rgba(52,211,153,0.3)",   text: "#34d399" },
};

function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || {
    label: priority || "—", bg: "rgba(107,105,96,0.1)",
    border: "rgba(107,105,96,0.3)", text: "#6b6960",
  };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 5,
      background: meta.bg, border: `1px solid ${meta.border}`, color: meta.text,
      flexShrink: 0, whiteSpace: "nowrap",
    }}>{meta.label}</span>
  );
}

/* ── 기능 카드 (상세, 인라인 편집 가능) ── */
function FeatureCard({ feature: initialFeature, index, isSynced, onDirty }) {
  const [open, setOpen]       = useState(false);
  const [feature, setFeature] = useState(initialFeature);
  const [editing, setEditing] = useState(null); // "name" | "description" | null

  function update(field, val) {
    setFeature(prev => ({ ...prev, [field]: val }));
    onDirty?.();
  }

  function EditableText({ field, value, style, multiline }) {
    const isEditing = editing === field;
    if (!isEditing) {
      return (
        <span
          onClick={e => { e.stopPropagation(); setEditing(field); }}
          title="클릭하여 편집"
          style={{ ...style, cursor: "text", borderRadius: 3,
            ":hover": { background: "rgba(0,0,0,0.03)" } }}
        >{value || <span style={{ color: C.sub, fontStyle: "italic" }}>내용 없음</span>}</span>
      );
    }
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={value}
          onChange={e => update(field, e.target.value)}
          onBlur={() => setEditing(null)}
          style={{
            width: "100%", resize: "vertical", border: `1px solid rgba(107,105,96,0.3)`,
            borderRadius: 5, padding: "6px 8px", fontSize: style?.fontSize || 13,
            fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
            background: "rgba(107,105,96,0.04)", outline: "none", color: C.text,
          }}
          rows={3}
        />
      );
    }
    return (
      <input
        autoFocus
        value={value}
        onChange={e => update(field, e.target.value)}
        onBlur={() => setEditing(null)}
        onKeyDown={e => e.key === "Enter" && setEditing(null)}
        style={{
          border: `1px solid rgba(107,105,96,0.3)`,
          borderRadius: 5, padding: "4px 8px",
          fontSize: style?.fontSize || 14, fontWeight: style?.fontWeight || 600,
          fontFamily: "inherit", background: "rgba(107,105,96,0.04)",
          outline: "none", color: C.text, width: "100%",
        }}
      />
    );
  }

  return (
    <div style={{
      borderRadius: 10,
      border: `1px solid ${isSynced ? "rgba(16,185,129,0.38)" : open ? "rgba(107,105,96,0.2)" : C.border}`,
      background: isSynced ? "rgba(16,185,129,0.06)" : open ? C.surface : C.card,
      boxShadow: isSynced ? "0 0 0 3px rgba(16,185,129,0.08)" : "none",
      marginBottom: 8, overflow: "hidden", transition: "all 0.15s",
    }}>
      {/* 헤더 */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "14px 18px", background: "none", border: "none",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          background: "rgba(107,105,96,0.1)", border: "1px solid rgba(107,105,96,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: C.accent,
        }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.text }}>
          {feature.name}
        </span>
        {feature.priority && <PriorityBadge priority={feature.priority} />}
        {isSynced && <DocumentSyncBadge status="synced" label="PRD 반영" compact />}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={C.muted} strokeWidth="2" strokeLinecap="round"
          style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* 상세 내용 + 편집 */}
      {open && (
        <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${C.border}` }}>

          {/* 기능명 편집 */}
          <div style={{ marginTop: 12 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.sub,
              letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4,
            }}>기능명</div>
            <EditableText
              field="name"
              value={feature.name}
              style={{ fontSize: 14, fontWeight: 600, color: C.text }}
            />
          </div>

          {/* 설명 편집 */}
          <div style={{ marginTop: 10 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.sub,
              letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4,
            }}>설명</div>
            <EditableText
              field="description"
              value={feature.description || ""}
              style={{ fontSize: 13, color: C.muted }}
              multiline
            />
          </div>

          {/* 요구사항 */}
          {feature.requirements?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C.sub,
                letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8,
              }}>요구사항</div>
              {feature.requirements.map((req, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 9, padding: "7px 0",
                  borderBottom: i < feature.requirements.length - 1 ? `1px solid ${C.border}` : "none",
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#34d399" strokeWidth="2.5">
                      <polyline points="2 6 5 9 10 3"/>
                    </svg>
                  </div>
                  <span
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => {
                      const newReqs = [...feature.requirements];
                      newReqs[i] = e.currentTarget.innerText;
                      update("requirements", newReqs);
                    }}
                    style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, flex: 1, outline: "none",
                      borderRadius: 3, padding: "1px 3px",
                    }}
                  >
                    {req}
                  </span>
                </div>
              ))}
              {/* 요구사항 추가 */}
              <button
                onClick={() => update("requirements", [...(feature.requirements || []), "새 요구사항"])}
                style={{
                  marginTop: 6, fontSize: 11, color: C.accent, background: "none",
                  border: `1px dashed ${C.accentBdr}`, borderRadius: 5, padding: "4px 10px",
                  cursor: "pointer",
                }}
              >+ 요구사항 추가</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── 심플 기능 행 (featureList만 있을 때) ── */
function SimpleFeatureRow({ name: initialName, index, isSynced, onDirty }) {
  const [name,    setName]    = useState(initialName);
  const [editing, setEditing] = useState(false);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
      borderRadius: 8,
      border: `1px solid ${isSynced ? "rgba(16,185,129,0.38)" : C.border}`,
      background: isSynced ? "rgba(16,185,129,0.06)" : C.card,
      boxShadow: isSynced ? "0 0 0 3px rgba(16,185,129,0.08)" : "none",
      marginBottom: 6,
    }}>
      <span style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: "rgba(107,105,96,0.1)", border: "1px solid rgba(107,105,96,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: C.accent,
      }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={e => {
            setName(e.target.value);
            onDirty?.();
          }}
          onBlur={() => setEditing(false)}
          onKeyDown={e => e.key === "Enter" && setEditing(false)}
          style={{
            flex: 1, border: `1px solid rgba(107,105,96,0.3)`, borderRadius: 5,
            padding: "3px 8px", fontSize: 14, fontFamily: "inherit",
            background: "rgba(107,105,96,0.04)", outline: "none", color: C.text,
          }}
        />
      ) : (
        <span
          style={{ flex: 1, fontSize: 14, color: C.text, cursor: "text" }}
          onClick={() => setEditing(true)}
          title="클릭하여 편집"
        >{name}</span>
      )}
      {isSynced && <DocumentSyncBadge status="synced" label="PRD 반영" compact />}
    </div>
  );
}

/* ══════════════════════════════════════
   피처 목록 → 텍스트 (AI 컨텍스트용)
══════════════════════════════════════ */
function featuresToText(coreFeatures, simpleList) {
  if (coreFeatures?.length) {
    return coreFeatures.map((f, i) => {
      const reqs = f.requirements?.map(r => `  - ${r}`).join("\n") || "";
      return `${i + 1}. ${f.name} [${f.priority || ""}]\n${f.description || ""}\n${reqs}`;
    }).join("\n\n");
  }
  if (simpleList?.length) {
    return simpleList.map((n, i) => `${i + 1}. ${n}`).join("\n");
  }
  return "";
}

/* ══════════════════════════════════════
   FEATURES PANEL (exported)
══════════════════════════════════════ */
export function FeaturesPanel({ project, syncState, onSave }) {
  const [search, setSearch] = useState("");
  const [isModified, setIsModified] = useState(false);
  const syncStatus = getDocumentSyncStatus(syncState, "features");
  const displayStatus = isModified ? "dirty" : syncStatus;
  const syncKeyword = syncState?.keyword || "실시간 채팅";

  const [localFeatures, setLocalFeatures] = useState(() => {
    const doc = project?.prdDocument;
    if (doc && Array.isArray(doc.coreFeatures) && doc.coreFeatures.length > 0) return doc.coreFeatures;
    return null;
  });

  const coreFeatures = localFeatures;

  const simpleList = useMemo(() => {
    if (coreFeatures) return null;
    const list = project?.featureList;
    return Array.isArray(list) && list.length > 0 ? list : null;
  }, [coreFeatures, project]);

  const filteredCore = useMemo(() => {
    if (!coreFeatures) return null;
    if (!search) return coreFeatures;
    const q = search.toLowerCase();
    return coreFeatures.filter(f =>
      f.name?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q)
    );
  }, [coreFeatures, search]);

  const filteredSimple = useMemo(() => {
    if (!simpleList) return null;
    if (!search) return simpleList;
    return simpleList.filter(n => n?.toLowerCase().includes(search.toLowerCase()));
  }, [simpleList, search]);

  const total = coreFeatures?.length ?? simpleList?.length ?? 0;
  const currentContent = featuresToText(coreFeatures, simpleList);

  return (
    <div style={{
      flex: 1, display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* ── 왼쪽: 기능 목록 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 헤더 */}
        <div style={{
          height: 52, flexShrink: 0, borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", padding: "0 28px",
          justifyContent: "space-between", background: C.surface,
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
              fontSize: 13, fontWeight: 500, color: "#a78bfa",
              padding: "2px 8px", borderRadius: 6,
              background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)",
            }}>기능 명세서</span>
            {total > 0 && (
              <span style={{
                fontSize: 11, color: C.muted, padding: "2px 8px", borderRadius: 10,
                background: "rgba(0,0,0,0.05)",
              }}>{total}개</span>
            )}
            {displayStatus !== "idle" && (
              <DocumentSyncBadge
                status={displayStatus}
                label={displayStatus === "dirty" ? "저장 필요" : syncStatus === "syncing" ? "PRD 반영 중" : "PRD 반영 완료"}
              />
            )}
          </div>

          {/* 검색 및 액션 */}
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
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="기능 검색..."
              style={{
                padding: "7px 12px 7px 28px", width: 200,
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 8, fontSize: 12, color: C.text, outline: "none",
              }}
            />
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 28px 60px" }}>

            {!coreFeatures && !simpleList && <EmptyState />}

            {/* 새 기능 추가 버튼 */}
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => {
                  const newList = [...(localFeatures || [])];
                  newList.push({ name: "새 기능", priority: "P2", description: "설명", requirements: [] });
                  setLocalFeatures(newList);
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
                <span>+</span> 새 기능 추가
              </button>
            </div>

            {/* 상세 카드 */}
            {filteredCore && (
              filteredCore.length === 0
                ? <div style={{ textAlign: "center", padding: "60px 0", color: C.sub, fontSize: 14 }}>검색 결과가 없습니다</div>
                : filteredCore.map((f, i) => (
                  <FeatureCard
                    key={i}
                    feature={f}
                    index={i}
                    isSynced={syncStatus !== "idle" && f.name?.includes(syncKeyword)}
                    onDirty={() => setIsModified(true)}
                  />
                ))
            )}

            {/* 심플 목록 */}
            {filteredSimple && (
              <>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: C.sub,
                  letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12,
                }}>PM 에이전트 기능 목록</div>
                {filteredSimple.map((name, i) => (
                  <SimpleFeatureRow
                    key={i}
                    name={name}
                    index={i}
                    isSynced={syncStatus !== "idle" && name?.includes(syncKeyword)}
                    onDirty={() => setIsModified(true)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 오른쪽: AI 채팅 ── */}
      <AiChatSidebar
        contextType="features"
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
        background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
      }}>⚡</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1916", marginBottom: 6 }}>
          기능 명세가 없습니다
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.6 }}>
          파이프라인을 실행하면 기능 목록이 자동으로 생성됩니다
        </div>
      </div>
    </div>
  );
}
