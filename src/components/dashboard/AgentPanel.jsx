"use client";

/**
 * AgentPanel.jsx
 * --------------
 * 풀스크린 Claude 스타일 LLM 채팅 메인 영역.
 *
 * 레이아웃:
 *   [상단 바: 프로젝트명 + 액션]
 *   [메시지 영역: max-width 680px 중앙 정렬]
 *   [입력 영역: Claude 스타일 라운드 컨테이너]
 *
 * 뷰 상태:
 *   showSettings === true  →  설정 패널 오버레이
 *   그 외                   →  채팅 화면
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  PROVIDERS,
  loadAgentConfig,
  saveAgentConfig,
  sendMessageStream,
} from "@/lib/agentApi";

/* ══════════════════════════════════════
   디자인 토큰
══════════════════════════════════════ */
const C = {
  bg:         "var(--surface)",
  topbar:     "#f7f6f3",
  border:     "rgba(0,0,0,0.07)",
  text:       "#1a1916",
  muted:      "var(--text-3)",
  subtle:     "var(--text-2)",
  userBg:     "var(--bg)",
  inputBg:    "var(--bg)",
  inputBdr:   "rgba(0,0,0,0.10)",
  hover:      "rgba(0,0,0,0.05)",
  accent:     "#6b6960",
  accentBg:   "rgba(26,25,22,0.14)",
  accentBdr:  "rgba(26,25,22,0.28)",
  sendBg:     "var(--text-1)",
  sendHover:  "var(--text-2)",
};

const MAX_W = 680;

/* ── 프리셋 제안 프롬프트 ── */
const SUGGESTIONS = [
  { icon: "✏️", text: "PRD 초안을 작성해줘" },
  { icon: "🔌", text: "API 엔드포인트 설계 검토해줘" },
  { icon: "🗄️", text: "DB 스키마 개선점 알려줘" },
  { icon: "🧪", text: "QA 테스트 케이스 만들어줘" },
  { icon: "🕸", text: "정합성 이슈 분석해줘" },
  { icon: "📐", text: "아키텍처 리뷰 해줘" },
];

/* ── 시간 포맷 ── */
function fmtTime(date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

/* ── 타이핑 점 ── */
function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: C.muted,
          animation: "ap-dot 1.2s ease infinite",
          animationDelay: `${i * 0.18}s`,
        }}/>
      ))}
      <style>{`
        @keyframes ap-dot {
          0%,80%,100% { transform: scale(0.7); opacity: 0.4; }
          40%          { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

/* ── 메시지 버블 ── */
function MessageBubble({ msg }) {
  const [hovered, setHovered] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <div style={{
          maxWidth: "75%",
          background: C.userBg,
          border: `1px solid ${C.border}`,
          borderRadius: "18px 18px 4px 18px",
          padding: "10px 16px",
          color: C.text,
          fontSize: 14,
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  /* 어시스턴트 메시지 */
  return (
    <div
      style={{ display: "flex", gap: 12, marginBottom: 24, position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 아바타 */}
      <div style={{
        width: 30, height: 30, borderRadius: 9,
        background: "var(--text-1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 900, color: "var(--bg)",
        flexShrink: 0, marginTop: 2,
        boxShadow: "0 2px 8px rgba(26,25,22,0.3)",
      }}>A</div>

      {/* 텍스트 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: msg.isError ? "#f87171" : C.text,
          fontSize: 14,
          lineHeight: 1.75,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {msg.content}
        </div>
        <div style={{
          marginTop: 6, fontSize: 11, color: C.subtle,
          opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>{fmtTime(msg.timestamp)}</span>
          <button
            onClick={handleCopy}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: copied ? C.accent : C.subtle, fontSize: 11,
              padding: 0, fontFamily: "inherit",
            }}
          >
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   설정 패널 (오버레이)
══════════════════════════════════════ */
function SettingsPanel({ config, onSave, onClose }) {
  const [provider, setProvider] = useState(config?.provider || "anthropic");
  const [apiKey,   setApiKey]   = useState(config?.apiKey   || "");
  const [model,    setModel]    = useState(config?.model     || PROVIDERS.anthropic.models[1].id);
  const [showKey,  setShowKey]  = useState(false);

  const handleProviderChange = (p) => {
    setProvider(p);
    setModel(PROVIDERS[p].models[0].id);
  };

  const handleSave = () => {
    if (!apiKey.trim()) return;
    onSave({ provider, apiKey: apiKey.trim(), model });
  };

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 440, background: "var(--surface)",
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        overflow: "hidden",
        fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
      }}>
        {/* 헤더 */}
        <div style={{
          padding: "18px 22px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Agent 설정</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>LLM 제공사 및 API 키를 설정하세요</div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.muted, fontSize: 20, lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        {/* 본문 */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* 제공사 선택 */}
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: ".03em" }}>
              LLM 제공사
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(PROVIDERS).map(([key, info]) => (
                <button key={key} onClick={() => handleProviderChange(key)} style={{
                  flex: 1, padding: "9px 12px",
                  background: provider === key ? C.accentBg : C.hover,
                  border: `1px solid ${provider === key ? C.accentBdr : C.border}`,
                  borderRadius: 8, cursor: "pointer",
                  color: provider === key ? C.accent : C.muted,
                  fontSize: 12, fontWeight: 600,
                  transition: "all 0.12s", fontFamily: "inherit",
                }}>
                  {info.label}
                </button>
              ))}
            </div>
          </div>

          {/* API 키 */}
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: ".03em" }}>
              API Key
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={provider === "anthropic" ? "sk-ant-..." : "sk-..."}
                style={{
                  width: "100%", padding: "10px 44px 10px 12px",
                  background: C.inputBg, border: `1px solid ${C.inputBdr}`,
                  borderRadius: 8, color: C.text, fontSize: 13,
                  fontFamily: "monospace", outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => e.target.style.borderColor = C.accentBdr}
                onBlur={e => e.target.style.borderColor = C.inputBdr}
              />
              <button onClick={() => setShowKey(s => !s)} style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: C.muted, fontSize: 13,
              }}>
                {showKey ? "숨김" : "표시"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: C.subtle, marginTop: 6 }}>
              키는 브라우저 로컬에 저장되며 백엔드 프록시를 통해 LLM API로 전달됩니다.
            </p>
          </div>

          {/* 모델 */}
          <div>
            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: ".03em" }}>
              모델
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px",
                background: C.inputBg, border: `1px solid ${C.inputBdr}`,
                borderRadius: 8, color: C.text, fontSize: 13,
                outline: "none", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {(PROVIDERS[provider]?.models || []).map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 푸터 */}
        <div style={{
          padding: "14px 22px",
          borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 8,
            background: "transparent", border: `1px solid ${C.border}`,
            color: C.muted, cursor: "pointer", fontSize: 13, fontFamily: "inherit",
          }}>
            취소
          </button>
          <button onClick={handleSave} disabled={!apiKey.trim()} style={{
            padding: "8px 20px", borderRadius: 8, cursor: apiKey.trim() ? "pointer" : "not-allowed",
            background: apiKey.trim() ? C.sendBg : "var(--border-2)",
            border: "none",
            color: apiKey.trim() ? "#fff" : C.muted,
            fontSize: 13, fontWeight: 700, fontFamily: "inherit",
            transition: "background 0.15s",
          }}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   메인 컴포넌트
══════════════════════════════════════ */
const VIEW_LABELS = {
  prd:      "PRD",
  features: "기능 명세서",
  api:      "API 명세서",
  erd:      "ERD 명세서",
  qa:       "QA",
};

export function AgentPanel({ project, view }) {
  const [config,       setConfig]       = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [isLoading,    setIsLoading]    = useState(false);
  const [streamText,   setStreamText]   = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const abortRef    = useRef(null);

  /* 설정 로드 */
  useEffect(() => {
    const saved = loadAgentConfig();
    if (saved) setConfig(saved);
    else setShowSettings(true); // 첫 방문이면 설정 자동 오픈
  }, []);

  /* 언마운트 시 스트림 취소 */
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  /* 새 메시지 시 스크롤 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  /* textarea 자동 높이 */
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  /* 설정 저장 */
  const handleSaveConfig = (newConfig) => {
    saveAgentConfig(newConfig);
    setConfig(newConfig);
    setShowSettings(false);
  };

  /* 메시지 전송 */
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || !config) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);
    setStreamText("");

    const history = [...messages, userMsg].map(m => ({
      role: m.role, content: m.content,
    }));

    let accumulated = "";

    await sendMessageStream({
      messages:       history,
      config,
      projectContext: project,
      signal:         controller.signal,
      onChunk: (delta) => {
        accumulated += delta;
        setStreamText(accumulated);
      },
      onDone: () => {
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: accumulated, timestamp: new Date() },
        ]);
        setStreamText("");
        setIsLoading(false);
        abortRef.current = null;
      },
      onError: (errMsg) => {
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: `오류가 발생했습니다: ${errMsg}\n\n백엔드 서버가 실행 중인지, API 키가 올바른지 확인해주세요.`,
            timestamp: new Date(),
            isError: true,
          },
        ]);
        setStreamText("");
        setIsLoading(false);
        abortRef.current = null;
      },
    });
  }, [input, isLoading, messages, config, project]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* 모델 표시 레이블 */
  const modelLabel = config
    ? (PROVIDERS[config.provider]?.models.find(m => m.id === config.model)?.label?.split(" ")[0] ?? config.model)
    : null;

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      height: "100vh", background: C.bg, overflow: "hidden",
      position: "relative",
      fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
    }}>

      {/* ── 상단 바 ── */}
      <TopBar
        project={project}
        view={view}
        modelLabel={modelLabel}
        hasMessages={messages.length > 0}
        onClear={() => { setMessages([]); setStreamText(""); }}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* ── 메시지 영역 ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
        {isEmpty ? (
          <EmptyState
            project={project}
            hasConfig={!!config}
            onOpenSettings={() => setShowSettings(true)}
            onSelectSuggestion={s => {
              setInput(s);
              setTimeout(() => { textareaRef.current?.focus(); adjustHeight(); }, 50);
            }}
          />
        ) : (
          <div style={{ maxWidth: MAX_W, margin: "0 auto", paddingTop: 32, paddingBottom: 16 }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {/* 스트리밍 실시간 */}
            {isLoading && streamText && (
              <MessageBubble
                msg={{ role: "assistant", content: streamText, timestamp: new Date() }}
              />
            )}
            {/* 타이핑 대기 */}
            {isLoading && !streamText && (
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: "var(--text-1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 900, color: "var(--bg)", flexShrink: 0, marginTop: 2,
                }}>A</div>
                <TypingDots />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── 입력 영역 ── */}
      <ChatInput
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        config={config}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        onInput={adjustHeight}
        textareaRef={textareaRef}
        onOpenSettings={() => setShowSettings(true)}
        onStop={() => { abortRef.current?.abort(); setIsLoading(false); setStreamText(""); }}
      />

      {/* ── 설정 오버레이 ── */}
      {showSettings && (
        <SettingsPanel
          config={config}
          onSave={handleSaveConfig}
          onClose={() => config && setShowSettings(false)}
        />
      )}
    </div>
  );
}

/* ── 상단 바 ── */
function TopBar({ project, view, modelLabel, hasMessages, onClear, onOpenSettings }) {
  const viewLabel = view ? VIEW_LABELS[view] : null;
  return (
    <div style={{
      height: 52, flexShrink: 0,
      borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center",
      padding: "0 24px",
      justifyContent: "space-between",
      background: C.topbar,
    }}>
      {/* 왼쪽: 프로젝트명 + 브레드크럼 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {project ? (
          <>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: `${project.color || "#7C3AED"}22`,
              border: `1px solid ${project.color || "#7C3AED"}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 900, color: project.color || "#6b6960",
            }}>
              {(project.name || "P").charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{project.name}</span>

            {/* 뷰 브레드크럼 */}
            {viewLabel && (
              <>
                <span style={{ fontSize: 13, color: C.sub }}>›</span>
                <span style={{
                  fontSize: 13, fontWeight: 500, color: C.accent,
                  padding: "2px 8px", borderRadius: 6,
                  background: "rgba(107,105,96,0.1)",
                  border: "1px solid rgba(107,105,96,0.2)",
                }}>
                  {viewLabel}
                </span>
              </>
            )}

            {modelLabel && (
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 20,
                background: C.accentBg, border: `1px solid ${C.accentBdr}`,
                color: C.accent, marginLeft: 2,
              }}>
                {modelLabel}
              </span>
            )}
          </>
        ) : (
          <span style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>프로젝트를 선택하세요</span>
        )}
      </div>

      {/* 오른쪽: 액션 */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {hasMessages && (
          <TopBarBtn onClick={onClear} title="대화 초기화">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
            </svg>
          </TopBarBtn>
        )}
        <TopBarBtn onClick={onOpenSettings} title="설정">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </TopBarBtn>
      </div>
    </div>
  );
}

function TopBarBtn({ onClick, title, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 32, height: 32, borderRadius: 7,
        background: hovered ? C.hover : "transparent",
        border: `1px solid ${hovered ? C.border : "transparent"}`,
        cursor: "pointer", color: hovered ? C.text : C.muted,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.12s",
      }}
    >
      {children}
    </button>
  );
}

/* ── 빈 상태 (프로젝트 선택 / 첫 메시지) ── */
function EmptyState({ project, hasConfig, onOpenSettings, onSelectSuggestion }) {
  return (
    <div style={{
      maxWidth: MAX_W, margin: "0 auto",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "calc(100vh - 52px - 120px)",
      paddingTop: 40, paddingBottom: 20,
    }}>
      {/* 로고 */}
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "var(--text-1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, fontWeight: 900, color: "var(--bg)",
        boxShadow: "0 8px 28px rgba(26,25,22,0.35)",
        marginBottom: 20,
      }}>A</div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 8px", textAlign: "center" }}>
        {project ? `${project.name}에 대해 물어보세요` : "안녕하세요 👋"}
      </h2>
      <p style={{ fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 1.65, margin: "0 0 32px" }}>
        {project
          ? "PRD 작성, API 설계, DB 스키마 등 프로젝트 전반에 대해 도움드릴게요."
          : "왼쪽 사이드바에서 프로젝트를 선택하거나 새로 만들어보세요."}
      </p>

      {!hasConfig && (
        <button
          onClick={onOpenSettings}
          style={{
            padding: "10px 22px", borderRadius: 10,
            background: "var(--text-1)",
            border: "none", cursor: "pointer",
            color: "var(--bg)", fontSize: 13, fontWeight: 700,
            boxShadow: "0 4px 16px rgba(26,25,22,0.35)",
            marginBottom: 32, fontFamily: "inherit",
          }}
        >
          ⚙️ API 키 설정하기
        </button>
      )}

      {/* 제안 프롬프트 */}
      {project && hasConfig && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10, width: "100%",
        }}>
          {SUGGESTIONS.map(s => (
            <SuggestionChip
              key={s.text}
              icon={s.icon}
              text={s.text}
              onClick={() => onSelectSuggestion(s.text)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionChip({ icon, text, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "11px 14px",
        background: hovered ? "var(--bg)" : "var(--surface)",
        border: `1px solid ${hovered ? "rgba(0,0,0,0.12)" : C.border}`,
        borderRadius: 10, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        color: hovered ? C.text : "#9ca3af",
        fontSize: 13, textAlign: "left",
        transition: "all 0.12s",
        fontFamily: "inherit",
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <span style={{ lineHeight: 1.4 }}>{text}</span>
    </button>
  );
}

/* ── 입력 영역 ── */
function ChatInput({ input, setInput, isLoading, config, onSend, onKeyDown, onInput, textareaRef, onOpenSettings, onStop }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{
      flexShrink: 0,
      padding: "14px 24px 20px",
    }}>
      <div style={{
        maxWidth: MAX_W, margin: "0 auto",
        background: C.inputBg,
        border: `1px solid ${focused ? "rgba(26,25,22,0.35)" : C.inputBdr}`,
        borderRadius: 14,
        transition: "border-color 0.15s",
        overflow: "hidden",
      }}>
        {/* 텍스트에어리어 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => { setInput(e.target.value); onInput(); }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={config ? "메시지를 입력하세요... (Shift+Enter로 줄바꿈)" : "API 키를 먼저 설정해주세요"}
          disabled={!config}
          rows={1}
          style={{
            width: "100%", padding: "14px 16px 10px",
            background: "transparent", border: "none",
            color: C.text, fontSize: 14, lineHeight: 1.65,
            resize: "none", outline: "none",
            fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
            boxSizing: "border-box",
            minHeight: 48, maxHeight: 160,
          }}
        />

        {/* 하단 액션바 */}
        <div style={{
          padding: "8px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* 왼쪽: 설정 없으면 API 키 버튼 */}
          {!config ? (
            <button onClick={onOpenSettings} style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.accent, fontSize: 12, fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              ⚙️ API 키 설정
            </button>
          ) : (
            <div style={{ fontSize: 11, color: C.subtle }}>
              Enter 전송 · Shift+Enter 줄바꿈
            </div>
          )}

          {/* 오른쪽: 전송 / 중지 */}
          {isLoading ? (
            <StopButton onClick={onStop} />
          ) : (
            <SendButton onClick={onSend} disabled={!input.trim() || !config} />
          )}
        </div>
      </div>
    </div>
  );
}

function SendButton({ onClick, disabled }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 34, height: 34, borderRadius: 9,
        background: disabled ? "var(--border-2)" : hovered ? C.sendHover : C.sendBg,
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.12s",
        boxShadow: disabled ? "none" : "0 2px 8px rgba(26,25,22,0.3)",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={disabled ? C.muted : "#fff"} strokeWidth="2.2" strokeLinecap="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    </button>
  );
}

function StopButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 34, height: 34, borderRadius: 9,
        background: hovered ? "var(--border)" : "var(--bg)",
        border: `1px solid ${C.border}`, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.12s",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill={C.muted}>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    </button>
  );
}
