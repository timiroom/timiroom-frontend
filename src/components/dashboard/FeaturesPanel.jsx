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

import { useState, useMemo, useEffect } from "react";
import { AiChatSidebar } from "./AiChatSidebar";
import { updateArtifact } from "@/lib/pipelineApi";

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
function FeatureCard({ feature, index, onUpdate }) {
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(null); // "name" | "description" | null

  function update(field, val) {
    onUpdate(index, { ...feature, [field]: val });
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
      border: `1px solid ${open ? "rgba(107,105,96,0.2)" : C.border}`,
      background: open ? C.surface : C.card,
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
function SimpleFeatureRow({ name, index, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(name);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
      borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, marginBottom: 6,
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
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { setEditing(false); onUpdate(index, draft); }}
          onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onUpdate(index, draft); } }}
          style={{
            flex: 1, border: `1px solid rgba(107,105,96,0.3)`, borderRadius: 5,
            padding: "3px 8px", fontSize: 14, fontFamily: "inherit",
            background: "rgba(107,105,96,0.04)", outline: "none", color: C.text,
          }}
        />
      ) : (
        <span
          style={{ flex: 1, fontSize: 14, color: C.text, cursor: "text" }}
          onClick={() => { setDraft(name); setEditing(true); }}
          title="클릭하여 편집"
        >{name}</span>
      )}
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
export function FeaturesPanel({ project, readOnly = false }) {
  const [search,          setSearch]          = useState("");
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [editedFeatures,  setEditedFeatures]  = useState([]);
  const [editedSimple,    setEditedSimple]    = useState([]);

  const coreFeatures = useMemo(() => {
    // featureList가 객체 배열이면 우선 사용 (사용자가 저장한 데이터)
    const list = project?.featureList;
    if (Array.isArray(list) && list.length > 0 && typeof list[0] === "object") return list;
    // prdDocument.coreFeatures 폴백
    const doc = project?.prdDocument;
    if (doc && Array.isArray(doc.coreFeatures) && doc.coreFeatures.length > 0)
      return doc.coreFeatures;
    return null;
  }, [project]);

  const simpleList = useMemo(() => {
    if (coreFeatures) return null;
    const list = project?.featureList;
    return Array.isArray(list) && list.length > 0 ? list : null;
  }, [coreFeatures, project]);

  // 프로젝트 변경 또는 데이터 로드 완료 시 편집 상태 동기화
  useEffect(() => {
    setEditedFeatures(coreFeatures ? [...coreFeatures] : []);
    setEditedSimple(simpleList ? [...simpleList] : []);
  }, [project?.id, project?.featureList, project?.prdDocument?.coreFeatures, coreFeatures, simpleList]);

  function handleFeatureUpdate(index, updated) {
    setEditedFeatures(prev => prev.map((f, i) => i === index ? updated : f));
  }

  function handleSimpleUpdate(index, newName) {
    setEditedSimple(prev => prev.map((n, i) => i === index ? newName : n));
  }

  async function handleSave() {
    // featureList 아티팩트에 항상 저장 (coreFeatures든 simpleList든)
    const artifactId = project?.artifactIds?.FEATURE_LIST
      ?? project?.artifactIds?.PRD;
    if (!artifactId) {
      alert("저장할 아티팩트 ID가 없습니다. 파이프라인을 먼저 실행하세요.");
      return;
    }

    const dataToSave = coreFeatures ? editedFeatures : editedSimple;
    const content = JSON.stringify(dataToSave);

    setSaving(true);
    try {
      await updateArtifact(artifactId, content);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const displayFeatures = coreFeatures ? editedFeatures : null;
  const displaySimple   = simpleList   ? editedSimple   : null;

  const filteredCore = useMemo(() => {
    if (!displayFeatures) return null;
    if (!search) return displayFeatures;
    const q = search.toLowerCase();
    return displayFeatures.filter(f =>
      f.name?.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q)
    );
  }, [displayFeatures, search]);

  const filteredSimple = useMemo(() => {
    if (!displaySimple) return null;
    if (!search) return displaySimple;
    return displaySimple.filter(n => n?.toLowerCase().includes(search.toLowerCase()));
  }, [displaySimple, search]);

  const total = displayFeatures?.length ?? displaySimple?.length ?? 0;
  const currentContent = featuresToText(displayFeatures, displaySimple);
  const canSave = !readOnly && !!(project?.artifactIds?.FEATURE_LIST || project?.artifactIds?.PRD);

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
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saved && (
              <span style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 5,
                background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
                color: "#34d399", fontWeight: 600,
              }}>✓ 저장됨</span>
            )}

            {/* 저장 버튼 */}
            {(coreFeatures || simpleList) && (
              <button
                onClick={handleSave}
                disabled={saving || !canSave}
                title={!canSave ? "파이프라인을 먼저 실행하세요" : ""}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  background: canSave ? "rgba(96,165,250,0.12)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${canSave ? "rgba(96,165,250,0.35)" : "rgba(0,0,0,0.08)"}`,
                  color: canSave ? "#60a5fa" : "#9ca3af",
                  cursor: saving || !canSave ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1, transition: "all 0.15s",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                {saving ? "저장 중..." : "저장"}
              </button>
            )}

            {/* 검색 */}
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

            {/* 상세 카드 */}
            {filteredCore && (
              filteredCore.length === 0
                ? <div style={{ textAlign: "center", padding: "60px 0", color: C.sub, fontSize: 14 }}>검색 결과가 없습니다</div>
                : filteredCore.map((f, i) => (
                    <FeatureCard key={i} feature={f} index={i} onUpdate={handleFeatureUpdate} />
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
                  <SimpleFeatureRow key={i} name={name} index={i} onUpdate={handleSimpleUpdate} />
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
