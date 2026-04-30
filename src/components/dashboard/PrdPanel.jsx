"use client";

/**
 * PrdPanel.jsx
 * ------------
 * 왼쪽: AI 채팅으로 요구사항 대화
 * 오른쪽: Notion 스타일 블록 에디터 (AI 초안 자동 적용)
 *
 * 블록 에디터:
 *  - h1 / h2 / h3 / p / bullet / number / quote / callout / divider
 *  - Enter → 새 블록 생성
 *  - Backspace (빈 블록) → 이전 블록으로 병합
 *  - "/" 입력 → 블록 타입 선택 팝업
 *  - 블록 좌측 핸들 클릭 → 타입 변경
 */

import { useState, useRef, useEffect, useCallback, useId } from "react";

/* ── 색상 토큰 ── */
const C = {
  bg:        "#212121",
  chatBg:    "#1a1a1a",
  editorBg:  "#212121",
  border:    "rgba(255,255,255,0.07)",
  surface:   "#252525",
  text:      "#ececec",
  muted:     "#8b8b8b",
  sub:       "#555",
  accent:    "#a78bfa",
  accentBg:  "rgba(167,139,250,0.1)",
  accentBdr: "rgba(167,139,250,0.25)",
  userBg:    "#2a2a2a",
  aiBg:      "transparent",
  inputBg:   "#2f2f2f",
  inputBdr:  "rgba(255,255,255,0.10)",
  hover:     "rgba(255,255,255,0.04)",
  commit:    "#7d4cfc",
};

/* ══════════════════════════════════════
   블록 타입 정의
══════════════════════════════════════ */
const BLOCK_TYPES = [
  { id: "h1",      label: "제목 1",    icon: "H1", desc: "큰 제목" },
  { id: "h2",      label: "제목 2",    icon: "H2", desc: "중간 제목" },
  { id: "h3",      label: "제목 3",    icon: "H3", desc: "작은 제목" },
  { id: "p",       label: "본문",      icon: "¶",  desc: "일반 텍스트" },
  { id: "bullet",  label: "글머리 기호", icon: "•", desc: "비순서 목록" },
  { id: "number",  label: "번호 목록",  icon: "1.", desc: "순서 있는 목록" },
  { id: "quote",   label: "인용",      icon: "❝",  desc: "인용문" },
  { id: "callout", label: "콜아웃",    icon: "💡", desc: "강조 블록" },
  { id: "divider", label: "구분선",    icon: "—",  desc: "가로 구분선" },
];

/* 블록 렌더 스타일 */
function blockStyle(type) {
  switch (type) {
    case "h1": return { fontSize: 30, fontWeight: 800, color: C.text, lineHeight: 1.25, padding: "4px 0", marginTop: 24 };
    case "h2": return { fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1.3, padding: "3px 0", marginTop: 18 };
    case "h3": return { fontSize: 17, fontWeight: 600, color: "#d4d4d4", lineHeight: 1.4, padding: "2px 0", marginTop: 12 };
    case "p":  return { fontSize: 15, fontWeight: 400, color: "#d4d4d4", lineHeight: 1.75, padding: "2px 0" };
    case "bullet": return { fontSize: 15, color: "#d4d4d4", lineHeight: 1.75, padding: "2px 0" };
    case "number": return { fontSize: 15, color: "#d4d4d4", lineHeight: 1.75, padding: "2px 0" };
    case "quote":  return { fontSize: 15, fontStyle: "italic", color: C.muted, lineHeight: 1.75, padding: "8px 16px", borderLeft: `3px solid ${C.accent}`, marginLeft: 4 };
    case "callout": return { fontSize: 14, color: "#d4d4d4", lineHeight: 1.7, padding: "12px 14px", background: "rgba(167,139,250,0.07)", borderRadius: 8, border: `1px solid ${C.accentBdr}` };
    default: return {};
  }
}

/* ── uid 생성 ── */
let uidCounter = 0;
function uid() { return `b${++uidCounter}`; }

/* ── 초기 빈 블록 ── */
function emptyBlock(type = "p") { return { id: uid(), type, content: "" }; }

/* ══════════════════════════════════════
   AI 샘플 대화 + PRD 초안
══════════════════════════════════════ */
const SAMPLE_CHAT = [
  { role: "assistant", content: "안녕하세요! PRD 작성을 도와드릴게요.\n\n어떤 제품이나 기능을 기획 중이신가요? 간략하게 설명해 주시면 요구사항 정의서 초안을 작성해 드립니다." },
];

const MOCK_PRD_BLOCKS = [
  { id: uid(), type: "h1",      content: "Align-it MVP PRD v1.0" },
  { id: uid(), type: "p",       content: "작성일: 2025-03-01  |  작성자: 기획팀  |  상태: AI 초안" },
  { id: uid(), type: "divider", content: "" },

  { id: uid(), type: "h2", content: "1. 프로젝트 개요" },
  { id: uid(), type: "p",  content: "Align-it은 LLM과 지식 그래프를 활용하여 PRD·API 명세·DB 스키마·QA 시나리오 간의 정합성을 자동으로 검증하는 소프트웨어 개발 지원 플랫폼입니다. 기획-개발 단계의 정보 불일치로 인한 재작업을 근본적으로 해소하는 것을 목표로 합니다." },

  { id: uid(), type: "h2",    content: "2. 목적 및 목표" },
  { id: uid(), type: "bullet", content: "기획-개발 단계의 정보 불일치로 인한 재작업 비용 절감 (목표: 40% 감소)" },
  { id: uid(), type: "bullet", content: "자동화된 명세 생성으로 초기 개발 속도 향상 (목표: 문서 작성 시간 60% 단축)" },
  { id: uid(), type: "bullet", content: "실시간 정합성 검증으로 품질 관리 강화" },
  { id: uid(), type: "bullet", content: "비개발자도 쉽게 사용할 수 있는 직관적 UI 제공" },

  { id: uid(), type: "h2", content: "3. 사용자 스토리" },
  { id: uid(), type: "callout", content: "👤 PM으로서, PRD를 자연어로 입력하면 기능 목록과 MoSCoW 우선순위가 자동으로 생성되기를 원합니다." },
  { id: uid(), type: "callout", content: "👩‍💻 개발자로서, 확정된 기능 목록을 기반으로 API 명세와 DB 스키마가 자동 생성되어 설계 시간을 줄이고 싶습니다." },
  { id: uid(), type: "callout", content: "🔍 QA 엔지니어로서, 기능·API·DB 간의 불일치를 자동으로 탐지하고 정합성 스코어를 실시간으로 확인하고 싶습니다." },

  { id: uid(), type: "h2", content: "4. 핵심 기능 요구사항" },
  { id: uid(), type: "h3", content: "4.1 요구사항 자동 분석 (Search · PM Agent)" },
  { id: uid(), type: "number", content: "자연어 PRD 문서 업로드 및 텍스트 입력 지원" },
  { id: uid(), type: "number", content: "시장 조사 리포트 자동 생성 (경쟁사, 트렌드, 타겟 유저)" },
  { id: uid(), type: "number", content: "기능 목록 자동 추출 및 MoSCoW 우선순위 분류" },
  { id: uid(), type: "number", content: "사용자 검토 및 수정 후 확정 처리" },

  { id: uid(), type: "h3", content: "4.2 명세 자동 생성 (PRD · API · DB Agent)" },
  { id: uid(), type: "number", content: "확정 기능 목록 기반 상세 PRD 문서 자동 생성" },
  { id: uid(), type: "number", content: "RESTful API 명세 (Swagger/OpenAPI 3.0) 자동 생성" },
  { id: uid(), type: "number", content: "PostgreSQL + Neo4j 통합 ERD 스키마 자동 설계" },

  { id: uid(), type: "h3", content: "4.3 정합성 자동 검증 (QA Agent)" },
  { id: uid(), type: "number", content: "지식 그래프 기반 기능-API-DB 연결 관계 추적" },
  { id: uid(), type: "number", content: "불일치 이슈 자동 탐지 및 정합성 스코어 산출 (0-100)" },
  { id: uid(), type: "number", content: "이슈 리포트 실시간 제공 및 수정 제안" },

  { id: uid(), type: "h2", content: "5. 비기능 요구사항" },
  { id: uid(), type: "bullet", content: "응답 시간: 일반 API 200ms 이내, 파이프라인 실행 30초 이내" },
  { id: uid(), type: "bullet", content: "가용성: 99.5% 이상 (월 기준)" },
  { id: uid(), type: "bullet", content: "보안: OAuth2 + JWT 인증, HTTPS 필수" },
  { id: uid(), type: "bullet", content: "확장성: 동시 사용자 1,000명 이상 지원" },

  { id: uid(), type: "h2", content: "6. 제약사항 및 가정" },
  { id: uid(), type: "quote", content: "LLM API는 사용자가 직접 키를 제공하며, 서버에 저장하지 않습니다. (Anthropic Claude / OpenAI GPT 지원)" },
  { id: uid(), type: "bullet", content: "초기 버전(MVP)은 Google OAuth만 지원 (GitHub OAuth는 후속 버전)" },
  { id: uid(), type: "bullet", content: "Neo4j Community Edition 사용 (엔터프라이즈 기능 미포함)" },

  { id: uid(), type: "h2", content: "7. 일정 및 마일스톤" },
  { id: uid(), type: "number", content: "Week 1-2: 인증 시스템 + 프로젝트 CRUD" },
  { id: uid(), type: "number", content: "Week 3-4: Search·PM Agent 파이프라인" },
  { id: uid(), type: "number", content: "Week 5-6: PRD·API·DB Agent + 명세 자동 생성" },
  { id: uid(), type: "number", content: "Week 7-8: QA Agent + 정합성 검증 + 지식 그래프" },
  { id: uid(), type: "number", content: "Week 9: 통합 테스트 + 베타 배포" },
];

/* ══════════════════════════════════════
   슬래시 명령 팝업
══════════════════════════════════════ */
function SlashMenu({ onSelect, onClose, position }) {
  const [query, setQuery] = useState("");
  const filtered = BLOCK_TYPES.filter(t =>
    t.label.includes(query) || t.desc.includes(query) || t.id.includes(query)
  );

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", zIndex: 999,
      top: position.y + 4, left: position.x,
      background: "#1e1e1e", border: `1px solid ${C.border}`,
      borderRadius: 10, padding: 6, width: 240,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      <div style={{ fontSize: 11, color: C.sub, padding: "4px 8px 6px", fontWeight: 600 }}>블록 타입</div>
      {filtered.map(t => (
        <button
          key={t.id}
          onMouseDown={e => { e.preventDefault(); onSelect(t.id); }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "7px 10px", borderRadius: 6,
            border: "none", background: "none", cursor: "pointer",
            textAlign: "left", color: C.text,
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.hover}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          <span style={{ width: 24, textAlign: "center", fontSize: 12, color: C.accent, fontWeight: 700 }}>{t.icon}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{t.label}</div>
            <div style={{ fontSize: 11, color: C.sub }}>{t.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════
   블록 타입 핸들 팝업
══════════════════════════════════════ */
function BlockTypeMenu({ onSelect, onClose }) {
  return (
    <div style={{
      position: "absolute", zIndex: 100, left: -220, top: 0,
      background: "#1e1e1e", border: `1px solid ${C.border}`,
      borderRadius: 10, padding: 6, width: 210,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      {BLOCK_TYPES.map(t => (
        <button
          key={t.id}
          onMouseDown={e => { e.preventDefault(); onSelect(t.id); onClose(); }}
          style={{
            display: "flex", alignItems: "center", gap: 9,
            width: "100%", padding: "6px 10px", borderRadius: 6,
            border: "none", background: "none", cursor: "pointer",
            textAlign: "left",
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.hover}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
        >
          <span style={{ width: 22, textAlign: "center", fontSize: 11, color: C.accent, fontWeight: 700 }}>{t.icon}</span>
          <span style={{ fontSize: 12, color: C.text }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════
   단일 블록
══════════════════════════════════════ */
function Block({ block, index, numberIndex, isFocused, onFocus, onChange, onKeyDown, blockRef, onTypeChange }) {
  const [showHandle, setShowHandle] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  if (block.type === "divider") {
    return (
      <div style={{ padding: "8px 0", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>
    );
  }

  const prefix = block.type === "bullet" ? "•" : block.type === "number" ? `${numberIndex}.` : null;

  return (
    <div
      style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 6 }}
      onMouseEnter={() => setShowHandle(true)}
      onMouseLeave={() => { setShowHandle(false); setShowTypeMenu(false); }}
    >
      {/* 블록 핸들 (좌측) */}
      <div style={{
        width: 20, flexShrink: 0, display: "flex", alignItems: "flex-start",
        paddingTop: block.type.startsWith("h") ? (block.type === "h1" ? 8 : block.type === "h2" ? 6 : 4) : 5,
        opacity: showHandle ? 1 : 0, transition: "opacity 0.1s",
        position: "relative",
      }}>
        <button
          onMouseDown={e => { e.preventDefault(); setShowTypeMenu(v => !v); }}
          style={{
            width: 18, height: 18, borderRadius: 4, border: "none",
            background: showHandle ? "rgba(255,255,255,0.08)" : "none",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            color: C.sub, fontSize: 11, padding: 0,
          }}
          title="블록 타입 변경"
        >
          ⋮⋮
        </button>
        {showTypeMenu && (
          <BlockTypeMenu onSelect={onTypeChange} onClose={() => setShowTypeMenu(false)} />
        )}
      </div>

      {/* 글머리 기호 / 번호 */}
      {prefix && (
        <span style={{
          flexShrink: 0, paddingTop: 5,
          fontSize: 15, color: C.accent, fontWeight: 600, minWidth: 20,
          userSelect: "none",
        }}>
          {prefix}
        </span>
      )}

      {/* 콜아웃 아이콘 */}
      {block.type === "callout" && (
        <span style={{ flexShrink: 0, fontSize: 16, paddingTop: 12 }}>💡</span>
      )}

      {/* 콘텐츠 */}
      <div
        ref={blockRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={onFocus}
        onInput={e => onChange(e.currentTarget.textContent)}
        onKeyDown={onKeyDown}
        data-placeholder={block.content === "" ? placeholderFor(block.type) : ""}
        style={{
          flex: 1, outline: "none", minHeight: 24,
          ...blockStyle(block.type),
          position: "relative",
        }}
      />
    </div>
  );
}

function placeholderFor(type) {
  switch (type) {
    case "h1": return "제목 1";
    case "h2": return "제목 2";
    case "h3": return "제목 3";
    case "bullet": return "목록 항목";
    case "number": return "번호 항목";
    case "quote": return "인용문을 입력하세요...";
    case "callout": return "콜아웃 내용을 입력하세요...";
    default: return "내용을 입력하거나 '/'로 블록 타입을 선택하세요";
  }
}

/* ══════════════════════════════════════
   블록 에디터
══════════════════════════════════════ */
function BlockEditor({ blocks, setBlocks, title, setTitle }) {
  const [focusedId, setFocusedId]     = useState(null);
  const [slashMenu, setSlashMenu]     = useState(null); // { blockId, position }
  const blockRefs = useRef({});
  const titleRef  = useRef(null);

  /* 블록 ref 등록 */
  function getRef(id) {
    if (!blockRefs.current[id]) blockRefs.current[id] = { current: null };
    return blockRefs.current[id];
  }

  /* DOM → state 동기화 */
  function handleChange(id, text) {
    // "/" 감지 → 슬래시 메뉴
    if (text === "/") {
      const el = blockRefs.current[id]?.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        setSlashMenu({ blockId: id, position: { x: rect.left, y: rect.bottom } });
      }
    } else {
      setSlashMenu(null);
    }
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content: text } : b));
  }

  /* 슬래시 메뉴에서 타입 선택 */
  function handleSlashSelect(type) {
    if (!slashMenu) return;
    const { blockId } = slashMenu;
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, type, content: "" } : b));
    setSlashMenu(null);
    // DOM 초기화
    const el = blockRefs.current[blockId]?.current;
    if (el) { el.textContent = ""; el.focus(); }
  }

  /* 블록 타입 변경 (핸들) */
  function handleTypeChange(id, type) {
    if (type === "divider") {
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === id);
        const next = [...prev];
        next.splice(idx, 1, { id, type: "divider", content: "" }, emptyBlock("p"));
        return next;
      });
    } else {
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, type } : b));
    }
  }

  /* Enter / Backspace 처리 */
  function handleKeyDown(e, id) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const idx = blocks.findIndex(b => b.id === id);
      const cur = blocks[idx];
      // h1/h2/h3 뒤에는 p로
      const newType = ["h1","h2","h3"].includes(cur.type) ? "p"
        : cur.type === "bullet" ? "bullet"
        : cur.type === "number" ? "number"
        : "p";
      const nb = emptyBlock(newType);
      setBlocks(prev => {
        const next = [...prev];
        next.splice(idx + 1, 0, nb);
        return next;
      });
      // 포커스 이동
      setTimeout(() => {
        const el = blockRefs.current[nb.id]?.current;
        if (el) { el.focus(); setFocusedId(nb.id); }
      }, 20);
    }

    if (e.key === "Backspace") {
      const idx = blocks.findIndex(b => b.id === id);
      const cur = blocks[idx];
      if (cur.content === "" && idx > 0) {
        e.preventDefault();
        setBlocks(prev => prev.filter(b => b.id !== id));
        const prevId = blocks[idx - 1].id;
        setTimeout(() => {
          const el = blockRefs.current[prevId]?.current;
          if (el) {
            el.focus();
            // 커서를 끝으로
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            window.getSelection()?.removeAllRanges();
            window.getSelection()?.addRange(range);
            setFocusedId(prevId);
          }
        }, 20);
      }
    }
  }

  /* 번호 목록 카운터 */
  let numberCount = 0;

  return (
    <div
      style={{ flex: 1, overflowY: "auto", padding: "48px 60px 120px" }}
      onClick={() => {
        // 빈 공간 클릭 → 마지막 블록 포커스
        const last = blocks[blocks.length - 1];
        if (last && last.type !== "divider") {
          blockRefs.current[last.id]?.current?.focus();
        }
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }} onClick={e => e.stopPropagation()}>
        {/* 문서 제목 */}
        <div
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          onInput={e => setTitle(e.currentTarget.textContent)}
          data-placeholder="제목 없음"
          style={{
            fontSize: 36, fontWeight: 900, color: C.text,
            outline: "none", marginBottom: 32, lineHeight: 1.2,
            borderBottom: `1px solid ${C.border}`, paddingBottom: 16,
          }}
        />

        {/* 블록 목록 */}
        {blocks.map((block, idx) => {
          if (block.type === "number") numberCount++;
          else if (idx === 0 || blocks[idx - 1]?.type !== "number") numberCount = 0;

          return (
            <Block
              key={block.id}
              block={block}
              index={idx}
              numberIndex={block.type === "number" ? numberCount : 0}
              isFocused={focusedId === block.id}
              onFocus={() => setFocusedId(block.id)}
              onChange={text => handleChange(block.id, text)}
              onKeyDown={e => handleKeyDown(e, block.id)}
              blockRef={ref => { if (!blockRefs.current[block.id]) blockRefs.current[block.id] = {}; blockRefs.current[block.id].current = ref; }}
              onTypeChange={type => handleTypeChange(block.id, type)}
            />
          );
        })}

        {/* 하단 추가 버튼 */}
        <button
          onClick={() => {
            const nb = emptyBlock("p");
            setBlocks(prev => [...prev, nb]);
            setTimeout(() => { blockRefs.current[nb.id]?.current?.focus(); }, 20);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 16,
            padding: "8px 0", background: "none", border: "none",
            cursor: "pointer", color: C.sub, fontSize: 13,
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.muted}
          onMouseLeave={e => e.currentTarget.style.color = C.sub}
        >
          <span style={{ fontSize: 18, fontWeight: 300 }}>+</span> 새 블록 추가
        </button>
      </div>

      {/* 슬래시 메뉴 */}
      {slashMenu && (
        <SlashMenu
          position={slashMenu.position}
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenu(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   AI 채팅 패널 (왼쪽)
══════════════════════════════════════ */
function PrdChat({ onApplyDraft }) {
  const [messages, setMessages] = useState(SAMPLE_CHAT);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const bottomRef  = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    // 시뮬레이션: 1.2초 후 AI 응답
    await new Promise(r => setTimeout(r, 1200));

    const lc = text.toLowerCase();
    let reply;

    if (lc.includes("prd") || lc.includes("초안") || lc.includes("작성") || lc.includes("생성") || lc.includes("만들어")) {
      reply = "요구사항을 분석했습니다!\n\nPRD 초안을 생성했어요. 아래 버튼을 눌러 에디터에 적용해 보세요. 이후 자유롭게 수정하실 수 있습니다.";
      setDraftReady(true);
    } else if (lc.includes("목표") || lc.includes("goal")) {
      reply = "좋습니다. 목표를 명확히 하는 것이 중요하네요.\n\n- 정합성 자동화\n- 재작업 비용 절감\n- 비개발자 접근성\n\n이 세 가지를 핵심 목표로 PRD에 포함할까요?";
    } else if (lc.includes("사용자") || lc.includes("user")) {
      reply = "사용자 유형을 정리해 드릴게요:\n\n1. **PM** — 기획 문서 입력, 기능 목록 확인\n2. **개발자** — API/DB 명세 자동 생성 활용\n3. **QA** — 정합성 스코어 모니터링\n\n이 세 역할을 기준으로 사용자 스토리를 작성할까요?";
    } else {
      reply = "이해했습니다. 추가로 어떤 기능이나 제약사항이 있나요?\n\n충분한 정보가 모이면 PRD 초안을 자동 생성해 드릴게요.\n\n**TIP:** \"PRD 작성해줘\" 라고 말씀하시면 바로 초안을 만들어 드립니다.";
    }

    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function adjustHeight() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  return (
    <div style={{
      width: 340, flexShrink: 0, display: "flex", flexDirection: "column",
      height: "100%", background: C.chatBg, borderRight: `1px solid ${C.border}`,
    }}>
      {/* 채팅 헤더 */}
      <div style={{
        padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg,#7d4cfc,#9b6dff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, color: "white", fontWeight: 800, flexShrink: 0,
        }}>A</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Align-it AI</div>
          <div style={{ fontSize: 11, color: C.muted }}>PRD 작성 도우미</div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            {msg.role === "user" ? (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{
                  maxWidth: "85%", padding: "9px 13px",
                  background: "#2f2f2f", borderRadius: "14px 14px 4px 14px",
                  fontSize: 13, color: C.text, lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
                  background: "linear-gradient(135deg,#7d4cfc,#9b6dff)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "white", fontWeight: 800,
                }}>A</div>
                <div style={{ maxWidth: "85%" }}>
                  <div style={{
                    padding: "9px 13px",
                    background: "transparent",
                    borderRadius: "14px 14px 14px 4px",
                    fontSize: 13, color: C.text, lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>

                  {/* PRD 초안 적용 버튼 */}
                  {draftReady && i === messages.length - 1 && (
                    <button
                      onClick={() => { onApplyDraft(); setDraftReady(false); }}
                      style={{
                        marginTop: 8, padding: "9px 14px",
                        background: C.commit, border: "none",
                        borderRadius: 8, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 7,
                        fontSize: 13, fontWeight: 700, color: "white",
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      PRD 초안 에디터에 적용
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* 로딩 인디케이터 */}
        {loading && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: "linear-gradient(135deg,#7d4cfc,#9b6dff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, color: "white", fontWeight: 800,
            }}>A</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 0" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: C.accent, opacity: 0.7,
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}` }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-end",
          background: C.inputBg, borderRadius: 12,
          border: `1px solid ${C.inputBdr}`, padding: "8px 10px",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
            placeholder="요구사항에 대해 이야기해 보세요..."
            rows={1}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 13, color: C.text, resize: "none", lineHeight: 1.5,
              fontFamily: "inherit", maxHeight: 120,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: input.trim() && !loading ? C.commit : "rgba(125,76,252,0.25)",
              border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #555;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════
   PRD PANEL (exported)
══════════════════════════════════════ */
export function PrdPanel({ project }) {
  const [blocks,  setBlocks]  = useState([emptyBlock("p")]);
  const [title,   setTitle]   = useState("");
  const [hasDraft, setHasDraft] = useState(false);

  function applyDraft() {
    setTitle(`${project?.name || "프로젝트"} PRD v1.0`);
    setBlocks(MOCK_PRD_BLOCKS.map(b => ({ ...b, id: uid() }))); // 새 id로 복사
    setHasDraft(true);
  }

  return (
    <div style={{
      flex: 1, display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>
      {/* 왼쪽: AI 채팅 */}
      <PrdChat onApplyDraft={applyDraft} />

      {/* 오른쪽: 에디터 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* 에디터 툴바 */}
        <div style={{
          height: 48, flexShrink: 0, display: "flex", alignItems: "center",
          padding: "0 20px", borderBottom: `1px solid ${C.border}`,
          background: C.surface, gap: 6,
        }}>
          {/* 워드 카운트 */}
          <span style={{ fontSize: 12, color: C.sub, marginRight: "auto" }}>
            {blocks.filter(b => b.content).reduce((acc, b) => acc + b.content.split(" ").length, 0)} 단어
            · {blocks.filter(b => b.type !== "divider").length} 블록
          </span>

          {hasDraft && (
            <span style={{
              fontSize: 11, padding: "3px 8px", borderRadius: 5,
              background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)",
              color: "#34d399", fontWeight: 600,
            }}>
              ✓ AI 초안 적용됨
            </span>
          )}

          {/* 내보내기 버튼 */}
          <button style={{
            padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
            background: "rgba(167,139,250,0.1)", border: `1px solid ${C.accentBdr}`,
            color: C.accent, cursor: "pointer",
          }}>
            내보내기
          </button>
        </div>

        {/* 블록 에디터 */}
        <BlockEditor
          blocks={blocks}
          setBlocks={setBlocks}
          title={title}
          setTitle={setTitle}
        />
      </div>
    </div>
  );
}
