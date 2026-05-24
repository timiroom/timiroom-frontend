"use client";

/**
 * PrdPanel.jsx
 * ------------
 * 왼쪽: Notion 스타일 리치 텍스트 에디터 (contentEditable 기반)
 * 오른쪽: AiChatSidebar (AI와 대화 → 에디터에 삽입)
 */

import { useState, useEffect, useRef } from "react";
import { AiChatSidebar } from "./AiChatSidebar";

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
};

/* ── HTML 이스케이프 ── */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ══════════════════════════════════════
   prdDocument JSON → HTML
══════════════════════════════════════ */
function prdJsonToHtml(doc) {
  if (!doc || typeof doc !== "object") return "";
  const out = [];

  if (doc.projectOverview) out.push(`<h1>${esc(doc.projectOverview)}</h1>`);

  if (doc.background) {
    out.push(`<h2>배경</h2><p>${esc(doc.background)}</p>`);
  }

  if (doc.goals?.length) {
    out.push(`<h2>목표</h2><ul>${doc.goals.map(g => `<li>${esc(g)}</li>`).join("")}</ul>`);
  }

  if (doc.kpi?.length) {
    out.push(`<h2>KPI</h2><ul>${doc.kpi.map(k =>
      `<li><strong>${esc(k.metric)}</strong>: ${esc(k.target)} (${esc(k.basis)})</li>`
    ).join("")}</ul>`);
  }

  if (doc.coreFeatures?.length) {
    out.push(`<h2>핵심 기능</h2>`);
    doc.coreFeatures.forEach(f => {
      out.push(`<h3>${esc(f.name)}${f.priority ? ` <code>${esc(f.priority)}</code>` : ""}</h3>`);
      if (f.description) out.push(`<p>${esc(f.description)}</p>`);
      if (f.requirements?.length) {
        out.push(`<ul>${f.requirements.map(r => `<li>${esc(r)}</li>`).join("")}</ul>`);
      }
    });
  }

  if (doc.userPersonas?.length) {
    out.push(`<h2>사용자 페르소나</h2>`);
    doc.userPersonas.forEach(p => {
      out.push(`<h3>${esc(p.name)} (${esc(p.age)}, ${esc(p.job)})</h3>`);
      if (p.goal)      out.push(`<p><strong>목표:</strong> ${esc(p.goal)}</p>`);
      if (p.painPoint) out.push(`<p><strong>불편함:</strong> ${esc(p.painPoint)}</p>`);
    });
  }

  if (doc.mvpScope) {
    out.push(`<h2>MVP 범위</h2>`);
    if (doc.mvpScope.included?.length)
      out.push(`<p><strong>포함:</strong> ${esc(doc.mvpScope.included.join(", "))}</p>`);
    if (doc.mvpScope.excluded?.length)
      out.push(`<p><strong>제외:</strong> ${esc(doc.mvpScope.excluded.join(", "))}</p>`);
    if (doc.mvpScope.rationale) out.push(`<p>${esc(doc.mvpScope.rationale)}</p>`);
  }

  if (doc.techStack && typeof doc.techStack === "object") {
    out.push(`<h2>기술 스택</h2><ul>`);
    Object.entries(doc.techStack).forEach(([k, v]) => {
      out.push(`<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`);
    });
    out.push(`</ul>`);
  }

  if (doc.releaseSchedule?.length) {
    out.push(`<h2>릴리즈 일정</h2>`);
    doc.releaseSchedule.forEach(r => {
      out.push(`<h3>${esc(r.milestone)} (${esc(r.date)})</h3>`);
      if (r.description) out.push(`<p>${esc(r.description)}</p>`);
      if (r.deliverables?.length) {
        out.push(`<ul>${r.deliverables.map(d => `<li>${esc(d)}</li>`).join("")}</ul>`);
      }
    });
  }

  return out.join("\n") || "<p><br></p>";
}

/* ── AI 텍스트(마크다운) → HTML 변환 ── */
function mdToHtml(text) {
  if (!text) return "";
  const lines  = text.split("\n");
  const parts  = [];
  let inUL = false, inOL = false;

  function closeList() {
    if (inUL) { parts.push("</ul>"); inUL = false; }
    if (inOL) { parts.push("</ol>"); inOL = false; }
  }

  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g,     "<em>$1</em>")
      .replace(/`(.+?)`/g,       "<code>$1</code>");
  }

  for (const line of lines) {
    if (line.startsWith("### ")) { closeList(); parts.push(`<h3>${inline(line.slice(4))}</h3>`); }
    else if (line.startsWith("## ")) { closeList(); parts.push(`<h2>${inline(line.slice(3))}</h2>`); }
    else if (line.startsWith("# ")) { closeList(); parts.push(`<h1>${inline(line.slice(2))}</h1>`); }
    else if (/^[-*] /.test(line)) {
      if (inOL) { parts.push("</ol>"); inOL = false; }
      if (!inUL) { parts.push("<ul>"); inUL = true; }
      parts.push(`<li>${inline(line.replace(/^[-*] /, ""))}</li>`);
    }
    else if (/^\d+\. /.test(line)) {
      if (inUL) { parts.push("</ul>"); inUL = false; }
      if (!inOL) { parts.push("<ol>"); inOL = true; }
      parts.push(`<li>${inline(line.replace(/^\d+\. /, ""))}</li>`);
    }
    else if (line.trim() === "") { closeList(); }
    else { closeList(); parts.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
  return parts.join("");
}

/* ══════════════════════════════════════
   툴바 설정
══════════════════════════════════════ */
const BLOCK_OPTS = [
  { value: "p",          label: "본문" },
  { value: "h1",         label: "제목 1" },
  { value: "h2",         label: "제목 2" },
  { value: "h3",         label: "제목 3" },
  { value: "blockquote", label: "인용" },
  { value: "pre",        label: "코드" },
];

const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20, 24, 28, 32];

const TEXT_COLORS = [
  { label: "기본",  value: "#1a1916" },
  { label: "회색",  value: "#9ca3af" },
  { label: "빨강",  value: "#ef4444" },
  { label: "주황",  value: "#f97316" },
  { label: "노랑",  value: "#ca8a04" },
  { label: "초록",  value: "#16a34a" },
  { label: "파랑",  value: "#2563eb" },
  { label: "보라",  value: "#7c3aed" },
  { label: "분홍",  value: "#db2777" },
];

const HL_COLORS = [
  { label: "없음",  value: "transparent" },
  { label: "노랑",  value: "#fef9c3" },
  { label: "초록",  value: "#dcfce7" },
  { label: "파랑",  value: "#dbeafe" },
  { label: "보라",  value: "#ede9fe" },
  { label: "분홍",  value: "#fce7f3" },
  { label: "주황",  value: "#ffedd5" },
  { label: "빨강",  value: "#fee2e2" },
  { label: "회색",  value: "#f3f4f6" },
];

/* ══════════════════════════════════════
   Notion 스타일 에디터
══════════════════════════════════════ */
function NotionEditor({ editorRef, onTextChange }) {
  const [blockType, setBlockType] = useState("p");
  const [fontSize,  setFontSize]  = useState(14);
  const [textColor, setTextColor] = useState("#1a1916");
  const [hlColor,   setHlColor]   = useState("transparent");
  const [isBold,    setIsBold]    = useState(false);
  const [isItalic,  setIsItalic]  = useState(false);
  const [colorMenu, setColorMenu] = useState(null); // "text" | "hl" | null

  function exec(cmd, val = null) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    syncState();
  }

  function syncState() {
    if (!editorRef.current) return;
    try {
      setIsBold(document.queryCommandState("bold"));
      setIsItalic(document.queryCommandState("italic"));
    } catch {}
    if (onTextChange) onTextChange(editorRef.current.innerText || "");

    const sel = window.getSelection();
    if (sel?.rangeCount) {
      let el = sel.getRangeAt(0).startContainer;
      if (el.nodeType === 3) el = el.parentElement;
      while (el && el !== editorRef.current) {
        const tag = el.tagName?.toLowerCase();
        if (BLOCK_OPTS.some(o => o.value === tag)) { setBlockType(tag); break; }
        el = el.parentElement;
      }
    }
  }

  function setBlock(tag) {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, tag);
    setBlockType(tag);
    syncState();
  }

  function applyFontSize(size) {
    setFontSize(size);
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = size + "px";
    try { range.surroundContents(span); }
    catch { const f = range.extractContents(); span.appendChild(f); range.insertNode(span); }
    syncState();
  }

  function applyTextColor(color) {
    setTextColor(color);
    exec("foreColor", color);
    setColorMenu(null);
  }

  function applyHL(color) {
    setHlColor(color);
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(color === "transparent" ? "removeFormat" : "hiliteColor", false, color === "transparent" ? null : color);
    setColorMenu(null);
    syncState();
  }

  function handleKeyDown(e) {
    if (e.metaKey || e.ctrlKey) {
      if      (e.key === "b") { e.preventDefault(); exec("bold"); }
      else if (e.key === "i") { e.preventDefault(); exec("italic"); }
      else if (e.key === "u") { e.preventDefault(); exec("underline"); }
    }
    if (e.key === "Tab") { e.preventDefault(); exec("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;"); }
  }

  /* ── 툴바 버튼 ── */
  const Btn = ({ label, active, onClick, title, xs }) => (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        minWidth: 28, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
        background: active ? "rgba(107,105,96,0.15)" : "none",
        color: active ? C.text : C.muted, fontSize: 12, fontWeight: 600,
        padding: "0 5px", display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.1s", ...xs,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(107,105,96,0.15)" : "none"; }}
    >{label}</button>
  );

  const Sep = () => <div style={{ width: 1, height: 18, background: C.border, margin: "0 3px", flexShrink: 0 }} />;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── 툴바 ── */}
      <div style={{
        height: 42, flexShrink: 0, display: "flex", alignItems: "center",
        padding: "0 14px", gap: 2, borderBottom: `1px solid ${C.border}`,
        background: "#f7f6f3", overflowX: "auto",
      }}>

        {/* 블록 타입 */}
        <select value={blockType} onChange={e => setBlock(e.target.value)} style={{
          height: 26, padding: "0 6px", borderRadius: 6,
          border: `1px solid ${C.border}`, background: "#f7f6f3",
          fontSize: 11, fontWeight: 600, color: C.text, cursor: "pointer", outline: "none", marginRight: 2,
        }}>
          {BLOCK_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <Sep />

        {/* 서식 */}
        <Btn label="B" active={isBold}   onClick={() => exec("bold")}         title="굵게 (Ctrl+B)" xs={{ fontWeight: 800 }} />
        <Btn label="I" active={isItalic} onClick={() => exec("italic")}       title="기울임 (Ctrl+I)" xs={{ fontStyle: "italic" }} />
        <Btn label="U" active={false}    onClick={() => exec("underline")}    title="밑줄 (Ctrl+U)" xs={{ textDecoration: "underline" }} />
        <Btn label="S" active={false}    onClick={() => exec("strikeThrough")} title="취소선" xs={{ textDecoration: "line-through" }} />

        <Sep />

        {/* 글꼴 크기 */}
        <select value={fontSize} onChange={e => applyFontSize(Number(e.target.value))} style={{
          height: 26, padding: "0 4px", borderRadius: 6,
          border: `1px solid ${C.border}`, background: "#f7f6f3",
          fontSize: 11, color: C.text, cursor: "pointer", outline: "none",
        }}>
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
        </select>

        <Sep />

        {/* 글자 색상 */}
        <div style={{ position: "relative" }}>
          <button
            onMouseDown={e => { e.preventDefault(); setColorMenu(colorMenu === "text" ? null : "text"); }}
            title="글자 색상"
            style={{
              width: 30, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
              background: "none", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 800, color: textColor, lineHeight: 1 }}>A</span>
            <div style={{ width: 16, height: 3, borderRadius: 2, background: textColor }} />
          </button>
          {colorMenu === "text" && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onMouseDown={() => setColorMenu(null)} />
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
                background: "white", border: `1px solid ${C.border}`, borderRadius: 10,
                padding: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, width: 132,
              }}>
                {TEXT_COLORS.map(col => (
                  <button key={col.value} onMouseDown={e => { e.preventDefault(); applyTextColor(col.value); }}
                    title={col.label}
                    style={{
                      height: 28, borderRadius: 6, cursor: "pointer", background: col.value,
                      border: textColor === col.value ? "2px solid #6b6960" : "1px solid rgba(0,0,0,0.1)",
                      color: ["#1a1916","#7c3aed","#2563eb","#db2777"].includes(col.value) ? "white" : "#1a1916",
                      fontSize: 9, fontWeight: 700,
                    }}>
                    {col.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 하이라이트 */}
        <div style={{ position: "relative" }}>
          <button
            onMouseDown={e => { e.preventDefault(); setColorMenu(colorMenu === "hl" ? null : "hl"); }}
            title="형광펜"
            style={{
              width: 30, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
              background: "none", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
            }}
          >
            <span style={{
              fontSize: 13, fontWeight: 800, color: C.text, lineHeight: 1,
              background: hlColor !== "transparent" ? hlColor : "none",
              padding: "0 2px", borderRadius: 2,
            }}>H</span>
            <div style={{ width: 16, height: 3, borderRadius: 2, background: hlColor !== "transparent" ? hlColor : C.border }} />
          </button>
          {colorMenu === "hl" && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onMouseDown={() => setColorMenu(null)} />
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100,
                background: "white", border: `1px solid ${C.border}`, borderRadius: 10,
                padding: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, width: 132,
              }}>
                {HL_COLORS.map(col => (
                  <button key={col.value} onMouseDown={e => { e.preventDefault(); applyHL(col.value); }}
                    title={col.label}
                    style={{
                      height: 28, borderRadius: 6, cursor: "pointer",
                      background: col.value === "transparent"
                        ? "repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 2px,white 2px,white 8px)"
                        : col.value,
                      border: hlColor === col.value ? "2px solid #6b6960" : "1px solid rgba(0,0,0,0.1)",
                      color: "#1a1916", fontSize: 9, fontWeight: 700,
                    }}>
                    {col.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <Sep />

        {/* 목록 */}
        <Btn label="• ≡" active={false} onClick={() => exec("insertUnorderedList")} title="글머리 기호 목록" />
        <Btn label="1. ≡" active={false} onClick={() => exec("insertOrderedList")}  title="번호 매기기 목록" />

        <Sep />

        {/* 들여쓰기 */}
        <Btn label="→" active={false} onClick={() => exec("indent")}  title="들여쓰기" />
        <Btn label="←" active={false} onClick={() => exec("outdent")} title="내어쓰기" />

        <Sep />

        {/* 링크 / 이미지 */}
        <Btn label="🔗" active={false} onClick={() => {
          const url = prompt("링크 URL:");
          if (url) exec("createLink", url);
        }} title="링크 삽입" />
        <Btn label="⎯" active={false} onClick={() => exec("insertHorizontalRule")} title="구분선 삽입" />
      </div>

      {/* ── 에디터 영역 ── */}
      <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncState}
          onKeyDown={handleKeyDown}
          onMouseUp={syncState}
          onKeyUp={syncState}
          data-placeholder="PRD를 작성하세요..."
          className="prd-notion-editor"
          style={{
            minHeight: "100%", maxWidth: 720, margin: "0 auto",
            padding: "48px 56px 120px", outline: "none",
            fontSize: 14, lineHeight: 1.85, color: C.text,
            fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
          }}
        />
      </div>

      <style>{`
        .prd-notion-editor[data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: var(--text-3);
          pointer-events: none;
          display: block;
        }
        .prd-notion-editor h1 { font-size: 28px; font-weight: 900; color: #1a1916; margin: 0 0 16px; line-height: 1.25; }
        .prd-notion-editor h2 { font-size: 20px; font-weight: 700; color: #1a1916; margin: 32px 0 10px; padding-bottom: 6px; border-bottom: 1px solid rgba(0,0,0,0.08); }
        .prd-notion-editor h3 { font-size: 16px; font-weight: 600; color: #1a1916; margin: 22px 0 6px; }
        .prd-notion-editor p  { margin: 5px 0; }
        .prd-notion-editor ul { padding-left: 24px; margin: 6px 0; }
        .prd-notion-editor ol { padding-left: 26px; margin: 6px 0; }
        .prd-notion-editor li { margin: 4px 0; line-height: 1.7; }
        .prd-notion-editor blockquote {
          border-left: 3px solid #6b6960; margin: 12px 0; padding: 10px 18px;
          background: rgba(107,105,96,0.07); border-radius: 0 8px 8px 0;
          color: #6b6960; font-style: italic;
        }
        .prd-notion-editor pre {
          background: #f0eeeb; padding: 14px 18px; border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.08); overflow-x: auto; margin: 12px 0;
          font-family: 'JetBrains Mono','Fira Code',monospace;
          font-size: 13px; color: #6b6960; white-space: pre;
        }
        .prd-notion-editor code {
          background: rgba(107,105,96,0.12); padding: 1px 5px;
          border-radius: 3px; font-family: monospace;
          font-size: 0.88em; color: #6b6960;
        }
        .prd-notion-editor a { color: #6b6960; text-decoration: underline; }
        .prd-notion-editor hr { border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 20px 0; }
        .prd-notion-editor:focus { outline: none; }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════
   PRD PANEL (exported)
══════════════════════════════════════ */
export function PrdPanel({ project }) {
  const editorRef     = useRef(null);
  const [text,         setText]        = useState("");
  const [hasDraft,     setHasDraft]    = useState(false);

  /* project.prdDocument → HTML → editor
     project.id 변경(다른 프로젝트 선택) 또는
     prdDocument 유무 변경(artifacts 늦게 로드) 시 재실행 */
  useEffect(() => {
    if (!editorRef.current) return;
    const doc = project?.prdDocument;
    if (doc && typeof doc === "object") {
      const html = prdJsonToHtml(doc);
      editorRef.current.innerHTML = html;
      setText(editorRef.current.innerText || "");
      setHasDraft(true);
    } else {
      editorRef.current.innerHTML = "<p><br></p>";
      setText("");
      setHasDraft(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, !!project?.prdDocument]);

  /* AI 내용 에디터에 삽입 */
  function handleApplyAiContent(aiText) {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const html = mdToHtml(aiText);
    document.execCommand("insertHTML", false, html || `<p>${esc(aiText)}</p>`);
    setText(editorRef.current.innerText || "");
  }

  return (
    <div style={{
      flex: 1, display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* ── 왼쪽: 에디터 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* 상단 바 */}
        <div style={{
          height: 48, flexShrink: 0, display: "flex", alignItems: "center",
          padding: "0 20px", gap: 8, borderBottom: `1px solid ${C.border}`,
          background: C.surface,
        }}>
          {project && (
            <>
              <div style={{
                width: 20, height: 20, borderRadius: 5,
                background: `${project.color || "var(--text-1)"}22`,
                border: `1px solid ${project.color || "var(--text-1)"}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 900, color: project.color || "#6b6960",
              }}>
                {(project.name || "P").charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{project.name}</span>
              <span style={{ fontSize: 13, color: C.sub }}>›</span>
            </>
          )}
          <span style={{
            fontSize: 13, fontWeight: 500, color: C.accent,
            padding: "2px 8px", borderRadius: 6,
            background: C.accentBg, border: `1px solid ${C.accentBdr}`,
          }}>PRD</span>

          <div style={{ flex: 1 }} />

          {hasDraft && (
            <span style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 5,
              background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.25)",
              color: "#34d399", fontWeight: 600,
            }}>✓ AI 초안 적용됨</span>
          )}
          <button style={{
            padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: C.accentBg, border: `1px solid ${C.accentBdr}`,
            color: C.accent, cursor: "pointer",
          }}>내보내기</button>
        </div>

        {/* Notion 에디터 */}
        <NotionEditor editorRef={editorRef} onTextChange={setText} />
      </div>

      {/* ── 오른쪽: AI 채팅 ── */}
      <AiChatSidebar
        contextType="prd"
        project={project}
        currentContent={text}
        onApplyContent={handleApplyAiContent}
      />
    </div>
  );
}
