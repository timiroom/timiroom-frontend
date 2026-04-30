"use client";

/**
 * PrdPanel.jsx
 * ------------
 * 왼쪽: 마크다운 에디터 (편집 + 미리보기 토글)
 * 오른쪽: AiChatSidebar (AI와 대화 → 초안 적용)
 */

import { useState } from "react";
import { AiChatSidebar } from "./AiChatSidebar";

/* ── 색상 토큰 ── */
const C = {
  bg:        "#212121",
  surface:   "#1a1a1a",
  editor:    "#1e1e1e",
  border:    "rgba(255,255,255,0.07)",
  text:      "#ececec",
  muted:     "#8b8b8b",
  sub:       "#555",
  accent:    "#a78bfa",
  accentBg:  "rgba(167,139,250,0.1)",
  accentBdr: "rgba(167,139,250,0.25)",
  code:      "#c4b5fd",
  commit:    "#7d4cfc",
};

/* ══════════════════════════════════════
   PRD 초안 마크다운 (AI 적용 시 삽입)
══════════════════════════════════════ */
const MOCK_PRD_MD = `# Align-it MVP PRD v1.0

작성일: 2025-03-01 | 작성자: 기획팀 | 상태: AI 초안

---

## 1. 프로젝트 개요

Align-it은 LLM과 지식 그래프를 활용하여 PRD·API 명세·DB 스키마·QA 시나리오 간의 정합성을 자동으로 검증하는 소프트웨어 개발 지원 플랫폼입니다. 기획-개발 단계의 정보 불일치로 인한 재작업을 근본적으로 해소하는 것을 목표로 합니다.

## 2. 목적 및 목표

- 기획-개발 단계의 정보 불일치로 인한 재작업 비용 절감 (목표: 40% 감소)
- 자동화된 명세 생성으로 초기 개발 속도 향상 (목표: 문서 작성 시간 60% 단축)
- 실시간 정합성 검증으로 품질 관리 강화
- 비개발자도 쉽게 사용할 수 있는 직관적 UI 제공

## 3. 사용자 스토리

> PM으로서, PRD를 자연어로 입력하면 기능 목록과 MoSCoW 우선순위가 자동으로 생성되기를 원합니다.

> 개발자로서, 확정된 기능 목록을 기반으로 API 명세와 DB 스키마가 자동 생성되어 설계 시간을 줄이고 싶습니다.

> QA 엔지니어로서, 기능·API·DB 간의 불일치를 자동으로 탐지하고 정합성 스코어를 실시간으로 확인하고 싶습니다.

## 4. 핵심 기능 요구사항

### 4.1 요구사항 자동 분석 (Search · PM Agent)

1. 자연어 PRD 문서 업로드 및 텍스트 입력 지원
2. 시장 조사 리포트 자동 생성 (경쟁사, 트렌드, 타겟 유저)
3. 기능 목록 자동 추출 및 MoSCoW 우선순위 분류
4. 사용자 검토 및 수정 후 확정 처리

### 4.2 명세 자동 생성 (PRD · API · DB Agent)

1. 확정 기능 목록 기반 상세 PRD 문서 자동 생성
2. RESTful API 명세 (Swagger/OpenAPI 3.0) 자동 생성
3. PostgreSQL + Neo4j 통합 ERD 스키마 자동 설계

### 4.3 정합성 자동 검증 (QA Agent)

1. 지식 그래프 기반 기능-API-DB 연결 관계 추적
2. 불일치 이슈 자동 탐지 및 정합성 스코어 산출 (0-100)
3. 이슈 리포트 실시간 제공 및 수정 제안

## 5. 비기능 요구사항

- 응답 시간: 일반 API 200ms 이내, 파이프라인 실행 30초 이내
- 가용성: 99.5% 이상 (월 기준)
- 보안: OAuth2 + JWT 인증, HTTPS 필수
- 확장성: 동시 사용자 1,000명 이상 지원

## 6. 제약사항 및 가정

> LLM API는 사용자가 직접 키를 제공하며, 서버에 저장하지 않습니다. (Anthropic Claude / OpenAI GPT 지원)

- 초기 버전(MVP)은 Google OAuth만 지원 (GitHub OAuth는 후속 버전)
- Neo4j Community Edition 사용 (엔터프라이즈 기능 미포함)

## 7. 일정 및 마일스톤

1. Week 1-2: 인증 시스템 + 프로젝트 CRUD
2. Week 3-4: Search·PM Agent 파이프라인
3. Week 5-6: PRD·API·DB Agent + 명세 자동 생성
4. Week 7-8: QA Agent + 정합성 검증 + 지식 그래프
5. Week 9: 통합 테스트 + 베타 배포
`;

/* ══════════════════════════════════════
   간단한 마크다운 → HTML 렌더러
══════════════════════════════════════ */
function esc(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function inlineFormat(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/`(.+?)`/g,       `<code style="background:rgba(167,139,250,0.15);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.9em;color:#c4b5fd;">$1</code>`)
    .replace(/\[(.+?)\]\((.+?)\)/g, `<a href="$2" style="color:#a78bfa;">$1</a>`);
}
function renderMarkdown(raw) {
  const lines  = raw.split("\n");
  const out    = [];
  let inUL     = false;
  let inOL     = false;
  let inCode   = false;
  let codeBuf  = [];

  function closeList() {
    if (inUL) { out.push("</ul>"); inUL = false; }
    if (inOL) { out.push("</ol>"); inOL = false; }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    /* 코드 블록 토글 */
    if (line.startsWith("```")) {
      if (!inCode) { closeList(); inCode = true; codeBuf = []; continue; }
      out.push(`<pre style="background:#1a1a1a;padding:12px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);overflow-x:auto;margin:12px 0;"><code style="font-family:monospace;font-size:13px;color:#c4b5fd;">${esc(codeBuf.join("\n"))}</code></pre>`);
      inCode = false; codeBuf = []; continue;
    }
    if (inCode) { codeBuf.push(line); continue; }

    /* 구분선 */
    if (/^---+$/.test(line.trim())) {
      closeList();
      out.push(`<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:20px 0;"/>`);
      continue;
    }

    /* 빈 줄 */
    if (line.trim() === "") { closeList(); out.push("<br/>"); continue; }

    /* 제목 */
    if (line.startsWith("### ")) { closeList(); out.push(`<h3 style="font-size:16px;font-weight:600;color:#d4d4d4;margin:16px 0 6px;">${inlineFormat(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## "))  { closeList(); out.push(`<h2 style="font-size:20px;font-weight:700;color:#ececec;margin:22px 0 8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.07);">${inlineFormat(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("# "))   { closeList(); out.push(`<h1 style="font-size:28px;font-weight:900;color:#ececec;margin:0 0 12px;line-height:1.25;">${inlineFormat(line.slice(2))}</h1>`); continue; }

    /* 인용 */
    if (line.startsWith("> ")) {
      closeList();
      out.push(`<blockquote style="border-left:3px solid #a78bfa;margin:8px 0;padding:8px 14px;background:rgba(167,139,250,0.07);border-radius:0 6px 6px 0;font-style:italic;color:#9ca3af;">${inlineFormat(line.slice(2))}</blockquote>`);
      continue;
    }

    /* 순서 없는 목록 */
    if (/^[-*] /.test(line)) {
      if (inOL) { out.push("</ol>"); inOL = false; }
      if (!inUL) { out.push(`<ul style="padding-left:20px;margin:6px 0;">`); inUL = true; }
      out.push(`<li style="color:#d4d4d4;font-size:14px;line-height:1.75;margin:2px 0;">${inlineFormat(line.replace(/^[-*] /,""))}</li>`);
      continue;
    }

    /* 순서 있는 목록 */
    if (/^\d+\. /.test(line)) {
      if (inUL) { out.push("</ul>"); inUL = false; }
      if (!inOL) { out.push(`<ol style="padding-left:22px;margin:6px 0;">`); inOL = true; }
      out.push(`<li style="color:#d4d4d4;font-size:14px;line-height:1.75;margin:2px 0;">${inlineFormat(line.replace(/^\d+\. /,""))}</li>`);
      continue;
    }

    /* 일반 단락 */
    closeList();
    out.push(`<p style="color:#d4d4d4;font-size:14px;line-height:1.75;margin:4px 0;">${inlineFormat(line)}</p>`);
  }

  closeList();
  return out.join("");
}

/* ══════════════════════════════════════
   마크다운 에디터
══════════════════════════════════════ */
function MarkdownEditor({ value, onChange }) {
  const [preview, setPreview] = useState(false);

  /* 툴바 버튼 핸들러 */
  function insertAt(before, after = "") {
    const ta = document.getElementById("prd-editor");
    if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = value.slice(s, e);
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    onChange(next);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(s + before.length, s + before.length + sel.length);
    }, 0);
  }

  const toolbarBtns = [
    { label: "H1", action: () => insertAt("# ")     },
    { label: "H2", action: () => insertAt("## ")    },
    { label: "H3", action: () => insertAt("### ")   },
    { label: "B",  action: () => insertAt("**", "**"), bold: true },
    { label: "I",  action: () => insertAt("*",  "*"),  italic: true },
    { label: "`",  action: () => insertAt("`",  "`"),  mono: true  },
    { label: "—",  action: () => insertAt("\n---\n") },
    { label: "• ", action: () => insertAt("- ")     },
    { label: "1.", action: () => insertAt("1. ")    },
    { label: "> ", action: () => insertAt("> ")     },
  ];

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 마크다운 툴바 */}
      <div style={{
        height: 38, flexShrink: 0,
        display: "flex", alignItems: "center",
        padding: "0 16px", gap: 2,
        borderBottom: `1px solid ${C.border}`,
        background: "#1a1a1a",
      }}>
        {toolbarBtns.map((btn, i) => (
          <button
            key={i}
            onMouseDown={e => { e.preventDefault(); btn.action(); }}
            style={{
              minWidth: 28, height: 26, borderRadius: 5,
              border: "none", background: "none", cursor: "pointer",
              color: C.muted, fontSize: btn.bold ? 13 : btn.italic ? 13 : 12,
              fontWeight: btn.bold ? 800 : 600,
              fontStyle: btn.italic ? "italic" : "normal",
              fontFamily: btn.mono ? "monospace" : "inherit",
              padding: "0 4px",
              transition: "all 0.1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = C.muted; }}
          >
            {btn.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: C.sub, marginRight: 8 }}>
          {wordCount} 단어
        </span>

        <button
          onClick={() => setPreview(v => !v)}
          style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
            background: preview ? C.accentBg : "rgba(255,255,255,0.05)",
            border: `1px solid ${preview ? C.accentBdr : C.border}`,
            color: preview ? C.accent : C.muted,
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {preview ? "✏️ 편집" : "👁 미리보기"}
        </button>
      </div>

      {/* 에디터 or 미리보기 */}
      {preview ? (
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "36px 56px", background: C.bg,
        }}>
          <div
            style={{ maxWidth: 700, margin: "0 auto" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value || "") }}
          />
        </div>
      ) : (
        <textarea
          id="prd-editor"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`# PRD 제목\n\n내용을 마크다운으로 작성하세요...\n\n## 섹션 제목\n\n- 목록 항목\n\n> 인용구\n\n**굵게** *기울임* \`코드\``}
          spellCheck={false}
          style={{
            flex: 1, background: C.editor, border: "none", outline: "none",
            color: "#cdd3db",
            fontSize: 14, lineHeight: 1.8,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            resize: "none",
            padding: "36px 56px",
            boxSizing: "border-box",
            overflowY: "auto",
            tabSize: 2,
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   PRD PANEL (exported)
══════════════════════════════════════ */
export function PrdPanel({ project }) {
  const [markdown, setMarkdown] = useState("");
  const [hasDraft, setHasDraft] = useState(false);

  function applyDraft() {
    setMarkdown(MOCK_PRD_MD.trim());
    setHasDraft(true);
  }

  return (
    <div style={{
      flex: 1, display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg,
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* 왼쪽: 마크다운 에디터 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* 상단 바 */}
        <div style={{
          height: 48, flexShrink: 0,
          display: "flex", alignItems: "center",
          padding: "0 20px", gap: 8,
          borderBottom: `1px solid ${C.border}`,
          background: C.surface,
        }}>
          {project && (
            <>
              <div style={{
                width: 20, height: 20, borderRadius: 5,
                background: `${project.color || "#7C3AED"}22`,
                border: `1px solid ${project.color || "#7C3AED"}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 900, color: project.color || "#a78bfa",
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
          }}>
            PRD
          </span>

          <div style={{ flex: 1 }} />

          {hasDraft && (
            <span style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 5,
              background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.25)",
              color: "#34d399", fontWeight: 600,
            }}>
              ✓ AI 초안 적용됨
            </span>
          )}

          <button
            style={{
              padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: C.accentBg, border: `1px solid ${C.accentBdr}`,
              color: C.accent, cursor: "pointer",
            }}
          >
            내보내기
          </button>
        </div>

        {/* 마크다운 에디터 */}
        <MarkdownEditor value={markdown} onChange={setMarkdown} />
      </div>

      {/* 오른쪽: AI 채팅 */}
      <AiChatSidebar contextType="prd" onApplyDraft={applyDraft} />
    </div>
  );
}
