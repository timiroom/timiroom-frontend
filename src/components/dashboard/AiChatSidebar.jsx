"use client";

/**
 * AiChatSidebar.jsx
 * -----------------
 * 실제 SSE 스트리밍 기반 AI 채팅 패널.
 * OpenAI / Anthropic 선택 가능.
 *
 * Props:
 *   contextType   "prd" | "features" | "api" | "erd" | "qa"
 *   project       현재 선택된 프로젝트 객체
 *   currentContent 현재 문서 내용 (AI에게 컨텍스트로 전달)
 *   onApplyContent (text: string) => void  — 에디터에 내용 적용
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  PROVIDERS,
  loadAgentConfig,
  saveAgentConfig,
  sendMessageStream,
} from "@/lib/agentApi";

const C = {
  bg:       "#f7f6f3",
  border:   "rgba(0,0,0,0.07)",
  text:     "#1a1916",
  muted:    "var(--text-3)",
  accent:   "#6b6960",
  inputBg:  "var(--bg)",
  inputBdr: "rgba(0,0,0,0.10)",
  aiColor:  "#7d4cfc",
};

/* ── 컨텍스트별 시스템 프롬프트 ── */
function buildContextSystemPrompt(contextType, project, currentContent) {
  const base = `당신은 Align-it AI 어시스턴트입니다. 항상 한국어로 답변하세요.
프로젝트명: ${project?.name || ""}
프로젝트 설명: ${project?.description || ""}`;

  const contentSection = currentContent
    ? `\n\n현재 문서 내용:\n---\n${currentContent}\n---`
    : "";

  const contextMap = {
    prd: `${base}${contentSection}

역할: 시니어 PM으로서 PRD 문서 작성을 도와주세요.
- 섹션 추가/수정 요청을 구체적인 마크다운 텍스트로 반환
- 요구사항은 "사용자가 ~할 때 → 시스템이 ~함" 구조로
- 수정된 전체 섹션 내용을 코드블록 없이 반환`,

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
  };

  return contextMap[contextType] || base;
}

/* ── 컨텍스트별 UI 메타 ── */
const CTX_META = {
  prd:      { subtitle: "PRD 작성 도우미",    applyLabel: "PRD에 적용",    placeholder: "PRD 수정 요청..." },
  features: { subtitle: "기능 명세서 도우미", applyLabel: "기능명세에 적용", placeholder: "기능 추가/수정 요청..." },
  api:      { subtitle: "API 설계 도우미",    applyLabel: "API 명세에 적용", placeholder: "API 설계 요청..." },
  erd:      { subtitle: "ERD 설계 도우미",    applyLabel: "ERD에 적용",    placeholder: "스키마 수정 요청..." },
  qa:       { subtitle: "QA 도우미",          applyLabel: "QA에 적용",     placeholder: "테스트 케이스 요청..." },
};

/* ══════════════════════════════════════
   설정 패널
══════════════════════════════════════ */
function SettingsPanel({ onSave }) {
  const [provider, setProvider] = useState("anthropic");
  const [model,    setModel]    = useState(PROVIDERS.anthropic.models[1].id);
  const [testing,  setTesting]  = useState(false);
  const [error,    setError]    = useState("");

  function handleProviderChange(p) {
    setProvider(p);
    setModel(PROVIDERS[p].models[0].id);
  }

  function handleSave() {
    saveAgentConfig({ provider, model });
    onSave({ provider, model });
  }

  async function handleTestAndSave() {
    setTesting(true); setError("");
    try {
      const { testApiKey } = await import("@/lib/agentApi");
      await testApiKey({ provider, model });
      saveAgentConfig({ provider, model });
      onSave({ provider, model });
    } catch (e) {
      setError(`백엔드 연결 실패: ${e.message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 18px", gap: 16 }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>AI 설정</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
          사용할 LLM 프로바이더와 모델을 선택하세요.<br/>API 키는 서버에서 관리합니다.
        </div>
      </div>

      {/* 프로바이더 선택 */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
          프로바이더
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(PROVIDERS).map(([key]) => (
            <button key={key} onClick={() => handleProviderChange(key)} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, cursor: "pointer",
              border: provider === key ? `1.5px solid ${C.aiColor}` : `1px solid ${C.border}`,
              background: provider === key ? `${C.aiColor}12` : C.inputBg,
              color: provider === key ? C.aiColor : C.muted,
              fontSize: 12, fontWeight: provider === key ? 700 : 400,
              transition: "all 0.12s",
            }}>
              {key === "anthropic" ? "Claude" : "GPT"}
            </button>
          ))}
        </div>
      </div>

      {/* 모델 선택 */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
          모델
        </label>
        <select value={model} onChange={e => setModel(e.target.value)} style={{
          width: "100%", padding: "8px 10px",
          background: C.inputBg, border: `1px solid ${C.inputBdr}`,
          borderRadius: 8, fontSize: 12, color: C.text, outline: "none",
        }}>
          {PROVIDERS[provider].models.map(m => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {error && <div style={{ fontSize: 11, color: "#f87171" }}>{error}</div>}

      <button onClick={handleSave} style={{
        padding: "10px", borderRadius: 8, border: "none",
        background: C.aiColor, color: "white",
        fontSize: 13, fontWeight: 700, cursor: "pointer",
      }}>
        시작하기
      </button>
      <button onClick={handleTestAndSave} disabled={testing} style={{
        padding: "8px", borderRadius: 8, border: `1px solid ${C.border}`,
        background: "transparent", color: C.muted,
        fontSize: 11, cursor: testing ? "not-allowed" : "pointer",
      }}>
        {testing ? "연결 테스트 중..." : "연결 테스트 후 시작"}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════
   메시지 버블
══════════════════════════════════════ */
function MessageBubble({ msg, isStreaming, onApplyConfirm, onDismissConfirm }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  /* 사용자 메시지 */
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

  /* 수정 제안 확인 메시지 */
  if (msg.type === "confirm") {
    return (
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
          background: `linear-gradient(135deg,${C.aiColor},#9b6dff)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, color: "white", fontWeight: 800,
        }}>A</div>

        {msg.resolved ? (
          /* 결정 완료 상태 */
          <div style={{
            fontSize: 12, color: C.muted,
            display: "flex", alignItems: "center", gap: 5, paddingTop: 4,
          }}>
            {msg.applied
              ? <><span style={{ color: "#34d399", fontWeight: 700 }}>✓</span> 문서에 적용되었습니다.</>
              : <><span>✗</span> 적용하지 않았습니다.</>
            }
          </div>
        ) : (
          /* 확인 카드 */
          <div style={{
            flex: 1, padding: "12px 14px",
            background: `${C.aiColor}0c`,
            border: `1px solid ${C.aiColor}2a`,
            borderRadius: "6px 14px 14px 14px",
          }}>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 10 }}>
              Align-AI가 내놓은 답변으로 수정해드릴까요?
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button
                onClick={() => onApplyConfirm(msg.id, msg.confirmContent)}
                style={{
                  padding: "6px 18px", borderRadius: 7, border: "none",
                  background: C.aiColor, color: "white",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                예, 수정해주세요
              </button>
              <button
                onClick={() => onDismissConfirm(msg.id)}
                style={{
                  padding: "6px 14px", borderRadius: 7,
                  border: `1px solid ${C.border}`, background: "transparent",
                  color: C.muted, fontSize: 12, cursor: "pointer",
                }}
              >
                아니요
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>
              채팅창에 <strong>네</strong> 또는 <strong>아니요</strong>를 입력해도 됩니다.
            </div>
          </div>
        )}
      </div>
    );
  }

  /* 일반 AI 메시지 */
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 2,
        background: `linear-gradient(135deg,${C.aiColor},#9b6dff)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, color: "white", fontWeight: 800,
      }}>A</div>
      <div style={{ maxWidth: "88%", flex: 1 }}>
        <div style={{
          fontSize: 13, color: C.text, lineHeight: 1.7,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {msg.content}
          {isStreaming && <span style={{
            display: "inline-block", width: 2, height: 14,
            background: C.aiColor, marginLeft: 2,
            animation: "aic-cursor 0.8s ease infinite",
            verticalAlign: "text-bottom",
          }}/>}
        </div>

        {/* 복사 버튼 */}
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
/* 사용자 "예" / "아니요" 인식 목록 */
const YES_ANSWERS = new Set(["네", "예", "yes", "응", "ㅇ", "ㅇㅇ", "좋아", "해줘", "적용해줘", "맞아", "수정해줘"]);
const NO_ANSWERS  = new Set(["아니요", "아니", "no", "ㄴ", "ㄴㄴ", "싫어", "괜찮아", "됐어"]);

export function AiChatSidebar({ contextType = "prd", project, currentContent, onApplyContent }) {
  const meta = CTX_META[contextType] || CTX_META.prd;

  const [config,       setConfig]       = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [streaming,    setStreaming]    = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [streamingId,  setStreamingId]  = useState(null);

  const bottomRef          = useRef(null);
  const textareaRef        = useRef(null);
  const abortRef           = useRef(null);
  const streamingContentRef = useRef("");   // 스트리밍 중 누적 내용
  const pendingConfirmRef  = useRef(null);  // { id, content } — 답변 대기 중인 확인 메시지

  // 설정 로드
  useEffect(() => {
    const saved = loadAgentConfig();
    if (saved?.provider) {
      setConfig(saved);
      setMessages([{
        id: "init", role: "assistant",
        content: `안녕하세요! ${meta.subtitle}입니다.\n\n${project?.name ? `**${project.name}** 프로젝트의 ` : ""}문서 작성을 도와드릴게요. 수정하거나 추가하고 싶은 내용을 알려주세요.`,
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  /* 확인 메시지 — 예 클릭 */
  function handleApplyConfirm(confirmId, content) {
    if (onApplyContent) onApplyContent(content);
    setMessages(prev => prev.map(m =>
      m.id === confirmId ? { ...m, resolved: true, applied: true } : m
    ));
    pendingConfirmRef.current = null;
  }

  /* 확인 메시지 — 아니요 클릭 */
  function handleDismissConfirm(confirmId) {
    setMessages(prev => prev.map(m =>
      m.id === confirmId ? { ...m, resolved: true, applied: false } : m
    ));
    pendingConfirmRef.current = null;
  }

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !config) return;

    /* ── 대기 중인 확인 메시지가 있을 때 예/아니요 처리 ── */
    const pending = pendingConfirmRef.current;
    if (pending) {
      const lower = text.toLowerCase();
      if (YES_ANSWERS.has(lower)) {
        if (onApplyContent) onApplyContent(pending.content);
        setMessages(prev => prev.map(m =>
          m.id === pending.id ? { ...m, resolved: true, applied: true } : m
        ));
        pendingConfirmRef.current = null;
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        // 사용자 메시지도 채팅에 표시
        setMessages(prev => [...prev, { id: Date.now(), role: "user", content: text }]);
        return;
      }
      if (NO_ANSWERS.has(lower)) {
        setMessages(prev => prev.map(m =>
          m.id === pending.id ? { ...m, resolved: true, applied: false } : m
        ));
        pendingConfirmRef.current = null;
        setInput("");
        if (textareaRef.current) textareaRef.current.style.height = "auto";
        setMessages(prev => [...prev, { id: Date.now(), role: "user", content: text }]);
        return;
      }
      // 새 질문 — 기존 확인 메시지 아니요로 처리 후 정상 전송
      setMessages(prev => prev.map(m =>
        m.id === pending.id ? { ...m, resolved: true, applied: false } : m
      ));
      pendingConfirmRef.current = null;
    }

    const userMsg = { id: Date.now(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setStreaming(true);
    streamingContentRef.current = "";

    const aiId = Date.now() + 1;
    setStreamingId(aiId);
    setMessages(prev => [...prev, { id: aiId, role: "assistant", content: "" }]);

    abortRef.current = new AbortController();

    const history = messages
      .filter(m => m.id !== "init" && m.type !== "confirm")
      .concat(userMsg)
      .map(m => ({ role: m.role, content: m.content }));

    await sendMessageStream({
      messages: history,
      config,
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
        streamingContentRef.current += delta;
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: m.content + delta } : m
        ));
      },
      onDone: () => {
        setStreaming(false);
        setStreamingId(null);
        /* 스트리밍 완료 → 수정 제안 확인 메시지 자동 추가 */
        const finalContent = streamingContentRef.current.trim();
        if (finalContent && onApplyContent) {
          const confirmId = `confirm_${aiId}`;
          const confirmMsg = {
            id:             confirmId,
            role:           "assistant",
            type:           "confirm",
            confirmContent: finalContent,
            resolved:       false,
            applied:        false,
          };
          setMessages(prev => [...prev, confirmMsg]);
          pendingConfirmRef.current = { id: confirmId, content: finalContent };
        }
        streamingContentRef.current = "";
      },
      onError: (err) => {
        setMessages(prev => prev.map(m =>
          m.id === aiId ? { ...m, content: `오류: ${err}` } : m
        ));
        setStreaming(false);
        setStreamingId(null);
        streamingContentRef.current = "";
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, streaming, config, messages, project, currentContent]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function adjustHeight() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }

  // 미설정 상태
  if (!config && !showSettings) {
    return (
      <div style={{
        width: 320, flexShrink: 0, borderLeft: `1px solid ${C.border}`,
        background: C.bg, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16, padding: 24,
      }}>
        <div style={{ fontSize: 32 }}>✨</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>AI 어시스턴트</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
            OpenAI 또는 Anthropic API 키를 설정하면<br/>실시간으로 문서를 수정할 수 있어요
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} style={{
          padding: "9px 20px", borderRadius: 8, border: "none",
          background: C.aiColor, color: "white",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
          API 설정하기
        </button>
        <style>{`@keyframes aic-cursor { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      </div>
    );
  }

  if (showSettings && !config) {
    return (
      <div style={{
        width: 320, flexShrink: 0, borderLeft: `1px solid ${C.border}`,
        background: C.bg, display: "flex", flexDirection: "column",
        height: "100%",
      }}>
        <div style={{
          padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg,${C.aiColor},#9b6dff)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, color: "white", fontWeight: 800,
          }}>A</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>API 설정</span>
        </div>
        <SettingsPanel onSave={(cfg) => { setConfig(cfg); setShowSettings(false);
          setMessages([{ id: "init", role: "assistant",
            content: `연결 완료! ${meta.subtitle}로 도움드릴게요.\n\n수정하거나 추가하고 싶은 내용을 알려주세요.` }]);
        }} />
        <style>{`@keyframes aic-cursor { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      width: 320, flexShrink: 0, borderLeft: `1px solid ${C.border}`,
      background: C.bg, display: "flex", flexDirection: "column", height: "100%",
    }}>
      {/* 헤더 */}
      <div style={{
        padding: "11px 14px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: `linear-gradient(135deg,${C.aiColor},#9b6dff)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: "white", fontWeight: 800, flexShrink: 0,
        }}>A</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Align-it AI</div>
          <div style={{ fontSize: 10, color: C.muted }}>{meta.subtitle}</div>
        </div>
        {/* 모델 표시 + 설정 */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 10,
            background: `${C.aiColor}14`, border: `1px solid ${C.aiColor}30`,
            color: C.aiColor,
          }}>
            {config?.provider === "anthropic" ? "Claude" : "GPT"}
          </span>
          <button onClick={() => { setConfig(null); setShowSettings(true); }} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.muted, fontSize: 14, padding: 2,
          }} title="설정 변경">⚙</button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 6px" }}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isStreaming={msg.id === streamingId}
            onApplyConfirm={handleApplyConfirm}
            onDismissConfirm={handleDismissConfirm}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}` }}>
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
            onClick={streaming ? () => abortRef.current?.abort() : handleSend}
            disabled={!streaming && !input.trim()}
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: streaming ? "#f87171" : (input.trim() ? C.aiColor : "rgba(26,25,22,0.2)"),
              border: "none",
              cursor: streaming || input.trim() ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            title={streaming ? "전송 중단" : "전송"}
          >
            {streaming ? (
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

      <style>{`
        @keyframes aic-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
        .chat-textarea::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
