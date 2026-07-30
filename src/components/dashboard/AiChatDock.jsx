"use client";

/**
 * AiChatDock.jsx
 * --------------
 * 화면 오른쪽 아래 아이콘으로 여닫는 플로팅 AI 어시스턴트. 모델은 EXAONE 고정.
 *
 * 예전에는 320px 사이드바로 항상 붙어 있었는데, ERD·API처럼 가로가 아쉬운 문서에서
 * 자리를 계속 차지했다. 지금은 필요할 때만 띄운다.
 *
 * 대화 상태는 이 컴포넌트가 들고 있고 창은 그 아래 JSX일 뿐이라, 창을 닫았다 열어도
 * 주고받은 내용과 대기 중인 수정 제안이 그대로 남는다.
 *
 * 두 가지 모드로 동작합니다:
 *
 *   ① 편집 모드 — document + onApplyEdits가 모두 주어졌을 때
 *      /api/v1/document/{docType}/edit 를 호출해 섹션/항목 단위 수정안을 받고,
 *      제안문 → 동의 → diff → 최종 승인 2단계를 거쳐야 문서에 반영합니다.
 *
 *   ② 상담 모드 — 그 외 (qa 등, 또는 읽기 전용일 때)
 *      스트리밍 대화만 합니다. 문서를 바꾸지 않습니다.
 *
 * Props:
 *   contextType    "prd" | "features" | "api" | "erd" | "qa" — UI 문구와 상담 프롬프트 선택
 *   docType        편집 API에 보낼 문서 종류. 없으면 contextType을 그대로 사용
 *   project        현재 선택된 프로젝트 객체
 *   currentContent 현재 문서 내용 텍스트 (상담 모드의 컨텍스트)
 *   document       현재 문서 JSON (편집 모드에서 사용)
 *   onApplyEdits   (edits: object[]) => Promise<void> | void — 승인된 수정안 적용
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { sendMessageStream, requestDocumentEdit } from "@/lib/agentApi";

const C = {
  bg:       "#f7f6f3",
  border:   "rgba(0,0,0,0.07)",
  text:     "#1a1916",
  muted:    "var(--text-3)",
  accent:   "#6b6960",
  inputBg:  "var(--bg)",
  inputBdr: "rgba(0,0,0,0.10)",
  aiColor:  "#7d4cfc",
  addBg:    "rgba(52,211,153,0.12)",
  addText:  "#0f7a53",
  delBg:    "rgba(248,113,113,0.12)",
  delText:  "#b4413f",
};

/* ── 컨텍스트별 시스템 프롬프트 (상담 모드) ── */
function buildContextSystemPrompt(contextType, project, currentContent) {
  const base = `당신은 Align-it AI 어시스턴트입니다. 항상 한국어로 답변하세요.
프로젝트명: ${project?.name || ""}
프로젝트 설명: ${project?.description || ""}`;

  const contentSection = currentContent
    ? `\n\n현재 문서 내용:\n---\n${currentContent}\n---`
    : "";

  const contextMap = {
    prd: `${base}${contentSection}

역할: 시니어 PM으로서 PRD에 대한 질문에 답하고 개선 방향을 조언하세요.`,

    features: `${base}${contentSection}

역할: 기능 명세서 작성을 도와주세요.
- 기능 추가/수정 요청 시 구체적인 명세 내용 반환
- MoSCoW(Must/Should/Could/Won't) 우선순위 포함
- 요구사항은 구체적인 시나리오로 작성`,

    api: `${base}${contentSection}

역할: REST API 설계를 도와주세요.
- 엔드포인트 추가/수정 시 method, path, request/response 구조 포함
- RESTful 설계 원칙 준수
- 인증 방식(JWT 등) 명시`,

    erd: `${base}${contentSection}

역할: 데이터베이스 스키마 설계를 도와주세요.
- 테이블 추가/수정 시 컬럼명, 타입, 제약조건 포함
- 관계(1:N, N:M 등) 명시
- PostgreSQL 기준으로 설계`,

    qa: `${base}${contentSection}

역할: QA 시나리오 작성을 도와주세요.
- 정상 흐름과 예외 흐름을 나누어 제시
- 각 테스트 케이스에 사전조건·입력·기대결과 포함`,
  };

  return contextMap[contextType] || base;
}

/* ── 컨텍스트별 UI 메타 ── */
const CTX_META = {
  prd:      { subtitle: "PRD 편집 도우미",      docLabel: "PRD",        placeholder: "PRD 수정 요청..." },
  features: { subtitle: "기능 명세서 도우미",   docLabel: "기능 명세서", placeholder: "기능 추가/수정 요청..." },
  api:      { subtitle: "API 명세서 도우미",    docLabel: "API 명세서",  placeholder: "API 수정 요청..." },
  erd:      { subtitle: "ERD 명세서 도우미",    docLabel: "ERD",        placeholder: "스키마 수정 요청..." },
  qa:       { subtitle: "QA 도우미",            docLabel: "QA 문서",    placeholder: "테스트 케이스 요청..." },
};

function renderInlineMarkdown(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

/* 창 헤더의 작은 아이콘 버튼 (넓게 보기 / 닫기) */
function IconBtn({ onClick, title, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        background: hovered ? "rgba(0,0,0,0.06)" : "transparent",
        border: "none", cursor: "pointer",
        color: hovered ? C.text : C.muted,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}

const AiAvatar = ({ size = 24 }) => (
  <div style={{
    width: size, height: size, borderRadius: size / 4, flexShrink: 0, marginTop: 2,
    background: `linear-gradient(135deg,${C.aiColor},#9b6dff)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size / 2.2, color: "white", fontWeight: 800,
  }}>A</div>
);

/* ══════════════════════════════════════
   섹션 diff 뷰
══════════════════════════════════════ */
const DIFF_COLLAPSE_AT = 14;   // 이 줄 수를 넘으면 접어서 보여준다

function SectionDiff({ edit }) {
  const [expanded, setExpanded] = useState(false);
  const lines = edit.diff || [];
  const changed = lines.filter(l => l.type !== "same").length;
  const visible = expanded ? lines : lines.slice(0, DIFF_COLLAPSE_AT);

  const added   = lines.filter(l => l.type === "add").length;
  const removed = lines.filter(l => l.type === "del").length;

  return (
    <div style={{ marginBottom: 8, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", background: "var(--bg)" }}>
      <div style={{
        padding: "6px 9px", background: "rgba(0,0,0,0.03)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{edit.label}</span>
        <span style={{ fontSize: 10, color: C.addText }}>+{added}</span>
        <span style={{ fontSize: 10, color: C.delText }}>−{removed}</span>
      </div>

      <div style={{ maxHeight: expanded ? 320 : "none", overflowY: expanded ? "auto" : "visible" }}>
        {visible.map((line, i) => (
          <div key={i} style={{
            padding: "2px 8px",
            fontSize: 11, lineHeight: 1.55,
            fontFamily: line.type === "same" ? "inherit" : "inherit",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            background: line.type === "add" ? C.addBg : line.type === "del" ? C.delBg : "transparent",
            color:      line.type === "add" ? C.addText : line.type === "del" ? C.delText : C.muted,
            textDecoration: line.type === "del" ? "line-through" : "none",
            opacity: line.type === "same" ? 0.55 : 1,
          }}>
            <span style={{ opacity: 0.6, marginRight: 4 }}>
              {line.type === "add" ? "+" : line.type === "del" ? "−" : " "}
            </span>
            {line.text}
          </div>
        ))}
      </div>

      {lines.length > DIFF_COLLAPSE_AT && (
        <button onClick={() => setExpanded(v => !v)} style={{
          width: "100%", padding: "5px 0", border: "none",
          borderTop: `1px solid ${C.border}`, background: "rgba(0,0,0,0.02)",
          color: C.muted, fontSize: 10.5, cursor: "pointer",
        }}>
          {expanded ? "접기" : `${lines.length - DIFF_COLLAPSE_AT}줄 더 보기 (변경 ${changed}줄)`}
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   수정 제안 카드
══════════════════════════════════════ */
const CardBtn = ({ onClick, disabled, primary, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: primary ? "6px 16px" : "6px 14px", borderRadius: 7,
      border: primary ? "none" : `1px solid ${C.border}`,
      background: primary ? C.aiColor : "transparent",
      color: primary ? "white" : C.muted,
      fontSize: 12, fontWeight: primary ? 700 : 400,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.7 : 1,
      display: "flex", alignItems: "center", gap: 5,
    }}
  >
    {children}
  </button>
);

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

/**
 * 2단계 승인 카드.
 *
 *   stage "proposal" — 무엇을 어떤 값으로 바꿀지 문장으로 먼저 설명하고 동의를 받는다
 *   stage "diff"     — 동의한 뒤 실제 변경 줄을 보여주고 최종 승인을 받는다
 *
 * 재작성은 서버에서 이미 끝나 있으므로 제안문과 diff는 같은 결과를 가리킨다.
 */
function EditProposal({ msg, onAccept, onApply, onDismiss, applying }) {
  if (msg.resolved) {
    return (
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <AiAvatar />
        <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 5, paddingTop: 4 }}>
          {msg.applied
            ? <><span style={{ color: "#34d399", fontWeight: 700 }}>✓</span> 문서에 적용했습니다.</>
            : <><span>✗</span> 적용하지 않았습니다.</>}
        </div>
      </div>
    );
  }

  const isProposal = msg.stage === "proposal";

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <AiAvatar />
      <div style={{
        flex: 1, minWidth: 0, padding: "12px 12px 11px",
        background: `${C.aiColor}0c`, border: `1px solid ${C.aiColor}2a`,
        borderRadius: "6px 14px 14px 14px",
      }}>
        {msg.reply && (
          <div style={{
            fontSize: 12.5, color: C.text, lineHeight: 1.65,
            marginBottom: 10, whiteSpace: "pre-wrap",
            // diff 단계에서는 제안문이 맥락으로 물러나고 변경 내용이 주인공이 된다
            opacity: isProposal ? 1 : 0.7,
          }}>
            {renderInlineMarkdown(msg.reply)}
          </div>
        )}

        {isProposal ? (
          <>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
              동의하시면 바꿀 내용을 먼저 보여드릴게요.
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <CardBtn primary onClick={() => onAccept(msg.id)}>
                <CheckIcon /> 예, 진행해주세요
              </CardBtn>
              <CardBtn onClick={() => onDismiss(msg.id)}>아니요</CardBtn>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 7 }}>
              변경 내용
            </div>
            {msg.edits.map(edit => <SectionDiff key={edit.section} edit={edit} />)}
            <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
              <CardBtn primary disabled={applying} onClick={() => onApply(msg.id, msg.edits)}>
                {applying ? "적용 중..." : <><CheckIcon /> 이대로 수정</>}
              </CardBtn>
              <CardBtn disabled={applying} onClick={() => onDismiss(msg.id)}>취소</CardBtn>
            </div>
          </>
        )}

        <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>
          채팅창에 <strong>네</strong> 또는 <strong>아니요</strong>를 입력해도 됩니다.
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   메시지 버블
══════════════════════════════════════ */
function MessageBubble({ msg, isStreaming }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (msg.role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{
          maxWidth: "85%", padding: "9px 13px",
          background: "var(--bg)", border: `1px solid ${C.border}`,
          borderRadius: "14px 14px 4px 14px",
          fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap",
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <AiAvatar />
      <div style={{ maxWidth: "88%", flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, color: C.text, lineHeight: 1.7,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {renderInlineMarkdown(msg.content)}
          {isStreaming && <span style={{
            display: "inline-block", width: 2, height: 14,
            background: C.aiColor, marginLeft: 2,
            animation: "aic-cursor 0.8s ease infinite",
            verticalAlign: "text-bottom",
          }}/>}
        </div>

        {!isStreaming && msg.content && (
          <div style={{ marginTop: 6 }}>
            <button onClick={handleCopy} style={{
              padding: "4px 10px", borderRadius: 6,
              border: `1px solid ${C.border}`, background: "transparent",
              color: C.muted, fontSize: 11, cursor: "pointer",
            }}>
              {copied ? "✓ 복사됨" : "복사"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════ */
const YES_ANSWERS = new Set(["네", "예", "yes", "응", "ㅇ", "ㅇㅇ", "좋아", "해줘", "적용해줘", "맞아", "수정해줘"]);
const NO_ANSWERS  = new Set(["아니요", "아니", "no", "ㄴ", "ㄴㄴ", "싫어", "괜찮아", "됐어"]);

/* 창 크기 — 기본 / 확대 */
const DOCK_SIZE = {
  normal: { width: 380, height: "min(620px, calc(100vh - 150px))" },
  wide:   { width: 560, height: "calc(100vh - 120px)" },
};

export function AiChatDock({
  contextType = "prd",
  docType,
  project,
  currentContent,
  document: docJson,
  onApplyEdits,
}) {
  const meta = CTX_META[contextType] || CTX_META.prd;
  const editDocType = docType || contextType;

  const [open,     setOpen]     = useState(false);
  const [wide,     setWide]     = useState(false);
  const [unread,   setUnread]   = useState(false);
  const lastSeenRef = useRef(0);

  /* 편집 모드 조건: 문서 JSON과 적용 핸들러가 모두 있어야 한다 */
  const editMode = Boolean(docJson && onApplyEdits);

  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [busy,     setBusy]     = useState(false);
  const [applying, setApplying] = useState(false);
  const [streamingId, setStreamingId] = useState(null);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const abortRef    = useRef(null);
  const pendingRef  = useRef(null);   // 답변 대기 중인 수정 제안 { id, edits }

  /* 프로젝트가 바뀌면 대화를 초기화 — 다른 프로젝트의 맥락이 섞이면 안 된다 */
  useEffect(() => {
    setMessages([{
      id: "init", role: "assistant",
      content: editMode
        ? `안녕하세요! ${meta.subtitle}입니다.\n\n${project?.name ? `**${project.name}** 프로젝트의 ` : ""}${meta.docLabel}에서 고치고 싶은 부분을 말씀해 주세요. 어떻게 바꿀지 먼저 제안드린 뒤 반영할게요.`
        : `안녕하세요! ${meta.subtitle}입니다.\n\n${project?.name ? `**${project.name}** 프로젝트에 대해 ` : ""}궁금한 점을 물어보세요.`,
    }]);
    pendingRef.current = null;
    // 인사말은 '읽지 않은 새 소식'이 아니므로 기준선을 여기서 맞춰 둔다
    lastSeenRef.current = 1;
    setUnread(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, contextType, editMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, open]);

  /* 창이 닫힌 동안 답이 도착하면 아이콘에 표시를 남긴다 */
  useEffect(() => {
    if (open) {
      lastSeenRef.current = messages.length;
      setUnread(false);
    } else if (messages.length > lastSeenRef.current) {
      setUnread(true);
    }
  }, [messages.length, open]);

  /* Esc로 닫기 — 전송 중에는 먼저 전송을 멈추게 두고 창은 유지한다 */
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape" && !busy) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  /* ── 제안 동의 → diff 단계로 ── */
  const acceptProposal = useCallback((msgId) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, stage: "diff" } : m
    ));
    if (pendingRef.current?.id === msgId) {
      pendingRef.current = { ...pendingRef.current, stage: "diff" };
    }
  }, []);

  /* ── 수정안 적용 ── */
  const applyEdits = useCallback(async (msgId, edits) => {
    setApplying(true);
    try {
      await onApplyEdits(edits);
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, resolved: true, applied: true } : m
      ));
      pendingRef.current = null;
    } catch (e) {
      // 실패한 제안은 열어 둔 채로 남긴다 — 사용자가 그대로 다시 시도할 수 있어야 한다
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`, role: "assistant",
        content: `적용에 실패했습니다: ${e.message}`,
      }]);
    } finally {
      setApplying(false);
    }
  }, [onApplyEdits]);

  const dismissEdits = useCallback((msgId) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, resolved: true, applied: false } : m
    ));
    pendingRef.current = null;
  }, []);

  /* ── 대화 히스토리 (서버 전송용) ── */
  function buildHistory(extra) {
    return messages
      .filter(m => m.id !== "init" && m.type !== "edit" && m.content)
      .concat(extra ? [extra] : [])
      .map(m => ({ role: m.role, content: m.content }));
  }

  /* ── 편집 모드: 수정 제안 요청 ── */
  async function runEditRequest(userMsg) {
    setBusy(true);
    abortRef.current = new AbortController();
    try {
      const result = await requestDocumentEdit({
        docType:     editDocType,
        document:    docJson,
        instruction: userMsg.content,
        history:     buildHistory(),
        signal:      abortRef.current.signal,
      });

      if (result.intent === "edit" && result.edits?.length) {
        const id = `edit_${Date.now()}`;
        setMessages(prev => [...prev, {
          id, role: "assistant", type: "edit",
          reply: result.reply, edits: result.edits,
          stage: "proposal",
          resolved: false, applied: false,
        }]);
        pendingRef.current = { id, edits: result.edits, stage: "proposal" };
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: "assistant",
          content: result.reply || "요청을 이해하지 못했어요. 다시 말씀해 주시겠어요?",
        }]);
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setMessages(prev => [...prev, {
          id: Date.now() + 1, role: "assistant",
          content: `오류: ${e.message}`,
        }]);
      }
    } finally {
      setBusy(false);
    }
  }

  /* ── 상담 모드: 스트리밍 대화 ── */
  async function runStreamRequest(userMsg) {
    setBusy(true);
    const aiId = Date.now() + 1;
    setStreamingId(aiId);
    setMessages(prev => [...prev, { id: aiId, role: "assistant", content: "" }]);

    abortRef.current = new AbortController();

    await sendMessageStream({
      messages: buildHistory(userMsg),
      systemPrompt: buildContextSystemPrompt(contextType, project, currentContent),
      projectContext: {
        name:        project?.name || "",
        description: project?.description || "",
        status:      project?.status || "",
        tags:        project?.tags || [],
        score:       project?.score || 0,
      },
      signal: abortRef.current.signal,
      onChunk: (delta) => {
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: m.content + delta } : m
        ));
      },
      onDone: () => { setBusy(false); setStreamingId(null); },
      onError: (err) => {
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: `오류: ${err}` } : m
        ));
        setBusy(false);
        setStreamingId(null);
      },
    });
  }

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || busy || applying) return;

    /* 대기 중인 수정 제안이 있으면 예/아니요를 먼저 해석한다.
       "네"의 의미는 단계마다 다르다 — 제안 단계에서는 '변경 내용 보여줘',
       diff 단계에서는 '문서에 반영해줘'. */
    const pending = pendingRef.current;
    if (pending) {
      const lower = text.toLowerCase();
      const userMsg = { id: Date.now(), role: "user", content: text };

      if (YES_ANSWERS.has(lower)) {
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        if (pending.stage === "proposal") acceptProposal(pending.id);
        else                              await applyEdits(pending.id, pending.edits);
        return;
      }
      if (NO_ANSWERS.has(lower)) {
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        dismissEdits(pending.id);
        return;
      }
      // 새로운 요청 — 기존 제안은 취소한 것으로 본다
      dismissEdits(pending.id);
    }

    const userMsg = { id: Date.now(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    if (editMode) await runEditRequest(userMsg);
    else          await runStreamRequest(userMsg);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, busy, applying, editMode, messages, project, currentContent, docJson]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function adjustHeight() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  const size = wide ? DOCK_SIZE.wide : DOCK_SIZE.normal;

  return (
    <>
      {/* ── 실행 아이콘 (오른쪽 아래 고정) ── */}
      <button
        onClick={() => setOpen(v => !v)}
        title={open ? "AI 어시스턴트 닫기" : "AI 어시스턴트 열기"}
        aria-label={open ? "AI 어시스턴트 닫기" : "AI 어시스턴트 열기"}
        style={{
          position: "fixed", right: 24, bottom: 24, zIndex: 60,
          width: 52, height: 52, borderRadius: "50%", border: "none",
          background: `linear-gradient(135deg,${C.aiColor},#9b6dff)`,
          color: "white", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 6px 20px rgba(125,76,252,0.38)",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.06)"; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        )}

        {/* 닫혀 있는 동안 도착한 답이 있으면 표시 */}
        {!open && unread && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            width: 13, height: 13, borderRadius: "50%",
            background: "#f87171", border: "2px solid var(--surface, #fff)",
            animation: "aic-pulse 1.6s ease infinite",
          }}/>
        )}
      </button>

      {/* ── 채팅 창 ── */}
      <div style={{
        position: "fixed", right: 24, bottom: 88, zIndex: 59,
        width: size.width, height: size.height,
        maxWidth: "calc(100vw - 48px)",
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
        display: open ? "flex" : "none",
        flexDirection: "column",
        overflow: "hidden",
        animation: "aic-pop 0.16s ease",
      }}>
        {/* 헤더 */}
        <div style={{
          padding: "11px 12px 11px 14px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          <AiAvatar size={26} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Align-it AI</div>
            <div style={{ fontSize: 10, color: C.muted }}>{meta.subtitle}</div>
          </div>
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 10,
            background: `${C.aiColor}14`, border: `1px solid ${C.aiColor}30`,
            color: C.aiColor, fontWeight: 600,
          }}>
            EXAONE
          </span>
          <IconBtn
            onClick={() => setWide(v => !v)}
            title={wide ? "기본 크기로" : "넓게 보기"}
          >
            {wide ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 3v6H3M15 21v-6h6"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 9V3h6M21 15v6h-6"/>
              </svg>
            )}
          </IconBtn>
          <IconBtn onClick={() => setOpen(false)} title="닫기">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </IconBtn>
        </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 6px" }}>
        {messages.map(msg =>
          msg.type === "edit" ? (
            <EditProposal
              key={msg.id}
              msg={msg}
              onAccept={acceptProposal}
              onApply={applyEdits}
              onDismiss={dismissEdits}
              applying={applying}
            />
          ) : (
            <MessageBubble key={msg.id} msg={msg} isStreaming={msg.id === streamingId} />
          )
        )}

        {/* 편집 모드는 스트리밍이 없어 진행 표시가 따로 필요하다 */}
        {busy && editMode && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <AiAvatar />
            <div style={{ fontSize: 12.5, color: C.muted, paddingTop: 3 }}>
              문서를 읽고 수정안을 만드는 중...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          background: C.inputBg, borderRadius: 12,
          border: `1px solid ${C.inputBdr}`, padding: "8px 10px",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
            placeholder={meta.placeholder}
            rows={1}
            className="chat-textarea"
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 13, color: C.text, resize: "none", lineHeight: 1.5,
              fontFamily: "inherit", maxHeight: 120, overflowY: "auto", scrollbarWidth: "none",
            }}
          />
          <button
            onClick={busy ? () => abortRef.current?.abort() : handleSend}
            disabled={!busy && !input.trim()}
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: busy ? "#f87171" : (input.trim() ? C.aiColor : "rgba(26,25,22,0.2)"),
              border: "none",
              cursor: busy || input.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            title={busy ? "전송 중단" : "전송"}
          >
            {busy ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="none">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      </div>

      <style>{`
        @keyframes aic-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes aic-pulse  { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes aic-pop {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .chat-textarea::-webkit-scrollbar { display: none; }
      `}</style>
    </>
  );
}
