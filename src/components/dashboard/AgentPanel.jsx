"use client";

/**
 * AgentPanel.jsx
 * --------------
 * 우측 상시 표시 AI 에이전트 채팅 패널.
 *
 * 뷰 상태:
 *   "setup"  — API 키 미설정 → 설정 화면
 *   "settings" — 설정 편집 화면 (기어 아이콘 클릭)
 *   "chat"   — 채팅 화면
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  PROVIDERS,
  loadAgentConfig,
  saveAgentConfig,
  clearAgentConfig,
  sendMessageStream,
} from "@/lib/agentApi";

/* ══════════════════════════════════════
   상수 / 유틸
══════════════════════════════════════ */
const PANEL_W = 288;

const SUGGESTION_PROMPTS = [
  "PRD 초안을 작성해줘",
  "API 엔드포인트 설계 검토해줘",
  "DB 스키마 개선점 알려줘",
  "QA 테스트 케이스 만들어줘",
  "정합성 이슈 분석해줘",
];

function formatTime(date) {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

/* ── 타이핑 커서 점 애니메이션 ── */
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "10px 14px", alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--db-purple-400)",
          animation: `agent-dot 1.2s ease infinite`,
          animationDelay: `${i * 0.2}s`,
        }}/>
      ))}
    </div>
  );
}

/* ── 메시지 버블 ── */
function MessageBubble({ msg, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isUser = msg.role === "user";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isUser ? "flex-end" : "flex-start",
      gap: 4,
      marginBottom: 14,
    }}>
      {/* 역할 레이블 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 10, color: "var(--db-text-muted)",
        flexDirection: isUser ? "row-reverse" : "row",
      }}>
        {isUser ? (
          <div style={{
            width: 16, height: 16, borderRadius: "50%",
            background: "var(--db-grad-purple)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 800, color: "#fff",
          }}>M</div>
        ) : (
          <div style={{
            width: 16, height: 16, borderRadius: 5,
            background: "rgba(139,92,246,0.2)",
            border: "1px solid var(--db-border-mid)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, color: "var(--db-purple-300)",
          }}>✦</div>
        )}
        <span>{formatTime(msg.timestamp)}</span>
      </div>

      {/* 말풍선 */}
      <div
        style={{
          maxWidth: "90%",
          padding: "9px 12px",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          background: isUser
            ? "rgba(139,92,246,0.2)"
            : "var(--db-bg-elevated)",
          border: isUser
            ? "1px solid var(--db-border-mid)"
            : "1px solid var(--db-border)",
          fontSize: 12.5,
          lineHeight: 1.6,
          color: "var(--db-text-primary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          position: "relative",
          cursor: "default",
        }}
        onMouseEnter={e => {
          const btn = e.currentTarget.querySelector(".copy-btn");
          if (btn) btn.style.opacity = "1";
        }}
        onMouseLeave={e => {
          const btn = e.currentTarget.querySelector(".copy-btn");
          if (btn) btn.style.opacity = "0";
        }}
      >
        {msg.content}
        {/* 복사 버튼 */}
        {!isUser && (
          <button
            className="copy-btn"
            onClick={handleCopy}
            style={{
              position: "absolute", top: 4, right: 4,
              background: "var(--db-bg-surface)",
              border: "1px solid var(--db-border)",
              borderRadius: 4, padding: "2px 6px",
              fontSize: 10, cursor: "pointer",
              color: copied ? "var(--db-green)" : "var(--db-text-muted)",
              opacity: 0, transition: "opacity 0.15s",
            }}
          >
            {copied ? "✓" : "복사"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   설정 화면
══════════════════════════════════════ */
function SettingsView({ onSave, onCancel, existingConfig }) {
  const [provider, setProvider] = useState(existingConfig?.provider || "anthropic");
  const [apiKey,   setApiKey]   = useState(existingConfig?.apiKey   || "");
  const [model,    setModel]    = useState(
    existingConfig?.model || PROVIDERS.anthropic.models[1].id
  );
  const [testing,  setTesting]  = useState(false);
  const [testResult, setTestResult] = useState(null); // null | "ok" | "fail"

  const handleProviderChange = (p) => {
    setProvider(p);
    setModel(PROVIDERS[p].models[1].id);
    setTestResult(null);
  };

  const handleSave = () => {
    if (!apiKey.trim()) return;
    onSave({ provider, apiKey: apiKey.trim(), model });
  };

  const inputStyle = {
    width: "100%",
    background: "var(--db-bg-elevated)",
    border: "1px solid var(--db-border)",
    borderRadius: 7,
    padding: "8px 11px",
    color: "var(--db-text-primary)",
    fontSize: 12,
    outline: "none",
    fontFamily: "monospace",
    boxSizing: "border-box",
  };

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--db-text-muted)", letterSpacing: ".08em", marginBottom: 10 }}>
          LLM PROVIDER
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {Object.entries(PROVIDERS).map(([key, prov]) => (
            <button key={key} onClick={() => handleProviderChange(key)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 12px", borderRadius: 8, cursor: "pointer",
              background: provider === key ? "rgba(139,92,246,0.12)" : "var(--db-bg-elevated)",
              border: provider === key ? "1px solid var(--db-border-active)" : "1px solid var(--db-border)",
              color: provider === key ? "var(--db-purple-300)" : "var(--db-text-secondary)",
              fontSize: 12, fontWeight: provider === key ? 600 : 400, textAlign: "left",
              transition: "all 0.15s",
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: "50%",
                border: provider === key ? "3.5px solid var(--db-purple-400)" : "1.5px solid var(--db-border-mid)",
                flexShrink: 0,
              }}/>
              {prov.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--db-text-muted)", letterSpacing: ".08em", marginBottom: 8 }}>
          API KEY
        </p>
        <input
          type="password"
          placeholder={provider === "anthropic" ? "sk-ant-api03-..." : "sk-..."}
          value={apiKey}
          onChange={e => { setApiKey(e.target.value); setTestResult(null); }}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = "var(--db-border-active)"}
          onBlur={e => e.target.style.borderColor = "var(--db-border)"}
        />
        <p style={{ fontSize: 10, color: "var(--db-text-muted)", marginTop: 5, lineHeight: 1.5 }}>
          키는 브라우저 로컬에만 저장되며,<br/>백엔드 프록시를 통해서만 사용됩니다.
        </p>
      </div>

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--db-text-muted)", letterSpacing: ".08em", marginBottom: 8 }}>
          MODEL
        </p>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          style={{ ...inputStyle, fontFamily: "inherit", cursor: "pointer" }}
        >
          {PROVIDERS[provider].models.map(m => (
            <option key={m.id} value={m.id} style={{ background: "#1E1B40" }}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* 테스트 결과 */}
      {testResult && (
        <div style={{
          padding: "8px 12px", borderRadius: 7, fontSize: 12,
          background: testResult === "ok" ? "var(--db-green-bg)" : "var(--db-red-bg)",
          color: testResult === "ok" ? "var(--db-green)" : "var(--db-red)",
          border: `1px solid ${testResult === "ok" ? "var(--db-green)" : "var(--db-red)"}20`,
        }}>
          {testResult === "ok" ? "✓ 연결 성공" : "✕ 연결 실패 — 키를 확인하세요"}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {existingConfig && (
          <button onClick={onCancel} style={{
            flex: 1, padding: "9px", borderRadius: 7, cursor: "pointer",
            background: "none", border: "1px solid var(--db-border)",
            color: "var(--db-text-muted)", fontSize: 12,
          }}>취소</button>
        )}
        <button
          onClick={handleSave}
          disabled={!apiKey.trim()}
          style={{
            flex: 2, padding: "9px", borderRadius: 7, cursor: apiKey.trim() ? "pointer" : "not-allowed",
            background: apiKey.trim() ? "var(--db-grad-purple)" : "var(--db-bg-elevated)",
            border: "none",
            color: apiKey.trim() ? "#fff" : "var(--db-text-muted)",
            fontSize: 12, fontWeight: 700,
            boxShadow: apiKey.trim() ? "var(--db-glow-sm)" : "none",
            transition: "all 0.15s",
          }}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   채팅 화면
══════════════════════════════════════ */
function ChatView({ config, project, onOpenSettings }) {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState("");
  const [isLoading,  setIsLoading]  = useState(false);
  const [streamText, setStreamText] = useState("");
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const abortRef    = useRef(null);  // 진행 중인 스트림 취소용

  /* 언마운트 시 진행 중인 스트림 취소 */
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  /* 최신 메시지로 스크롤 */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText]);

  /* textarea 자동 높이 */
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // 이전 스트림이 남아 있으면 취소
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setStreamText("");

    // 백엔드 전송용 메시지 포맷 (system 제외, role/content만)
    const history = [...messages, userMsg].map(m => ({
      role:    m.role,
      content: m.content,
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
            role:      "assistant",
            content:   `오류가 발생했습니다: ${errMsg}\n\n백엔드 서버가 실행 중인지, API 키가 올바른지 확인해주세요.`,
            timestamp: new Date(),
            isError:   true,
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

  const clearChat = () => setMessages([]);

  /* 모델 레이블 */
  const modelLabel = PROVIDERS[config.provider]?.models
    .find(m => m.id === config.model)?.label
    ?.split(" ")[0] ?? config.model;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* 컨텍스트 배지 */}
      {project && (
        <div style={{
          padding: "7px 12px",
          borderBottom: "1px solid var(--db-border)",
          display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "var(--db-purple-400)", flexShrink: 0,
          }}/>
          <span style={{ fontSize: 11, color: "var(--db-text-muted)", overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </span>
          <span style={{
            marginLeft: "auto", fontSize: 10,
            padding: "2px 7px", borderRadius: 10,
            background: "rgba(139,92,246,0.12)",
            border: "1px solid var(--db-border-mid)",
            color: "var(--db-purple-300)", flexShrink: 0,
          }}>
            {modelLabel}
          </span>
        </div>
      )}

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 4px" }}>
        {messages.length === 0 && !isLoading ? (
          /* 빈 상태 */
          <div style={{ paddingTop: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, margin: "0 auto 10px",
                background: "rgba(139,92,246,0.12)",
                border: "1px solid var(--db-border-mid)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
              }}>✦</div>
              <p style={{ fontSize: 12, color: "var(--db-text-muted)", lineHeight: 1.6 }}>
                프로젝트에 대해 무엇이든<br/>물어보세요
              </p>
            </div>
            {/* 빠른 제안 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SUGGESTION_PROMPTS.map(s => (
                <button key={s} onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  style={{
                    padding: "8px 11px", borderRadius: 8, cursor: "pointer",
                    background: "var(--db-bg-surface)",
                    border: "1px solid var(--db-border)",
                    color: "var(--db-text-secondary)", fontSize: 11,
                    textAlign: "left", transition: "all 0.12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--db-border-mid)"; e.currentTarget.style.color = "var(--db-text-primary)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--db-border)"; e.currentTarget.style.color = "var(--db-text-secondary)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {/* 스트리밍 중 실시간 텍스트 */}
            {isLoading && streamText && (
              <MessageBubble
                msg={{ role: "assistant", content: streamText, timestamp: new Date() }}
              />
            )}
            {/* 스트리밍 시작 전 타이핑 표시 */}
            {isLoading && !streamText && <TypingDots />}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{
        borderTop: "1px solid var(--db-border)",
        padding: "10px 12px",
        background: "var(--db-bg-base)",
        flexShrink: 0,
      }}>
        {messages.length > 0 && (
          <button onClick={clearChat} style={{
            display: "block", marginLeft: "auto", marginBottom: 6,
            background: "none", border: "none", cursor: "pointer",
            fontSize: 10, color: "var(--db-text-muted)",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--db-red)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--db-text-muted)"}
          >대화 초기화</button>
        )}
        <div style={{
          display: "flex", gap: 8, alignItems: "flex-end",
          background: "var(--db-bg-elevated)",
          border: "1px solid var(--db-border)",
          borderRadius: 10, padding: "8px 10px",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { setInput(e.target.value); adjustHeight(); }}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요... (Enter 전송)"
            rows={1}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "var(--db-text-primary)", fontSize: 12, lineHeight: 1.5,
              resize: "none", fontFamily: "inherit", maxHeight: 120,
              overflowY: "auto",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              background: input.trim() && !isLoading ? "var(--db-grad-purple)" : "var(--db-bg-surface)",
              border: "none",
              boxShadow: input.trim() && !isLoading ? "var(--db-glow-sm)" : "none",
              transition: "all 0.15s",
            }}
          >
            {isLoading ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--db-text-muted)" strokeWidth="2.5"
                style={{ animation: "agent-spin 0.8s linear infinite" }}>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={input.trim() ? "#fff" : "var(--db-text-muted)"} strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
        <p style={{ fontSize: 10, color: "var(--db-text-muted)", marginTop: 5, textAlign: "center" }}>
          Shift+Enter 줄바꿈 · Enter 전송
        </p>
      </div>

      <style>{`
        @keyframes agent-dot {
          0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes agent-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════
   메인 export — AgentPanel
══════════════════════════════════════ */
export function AgentPanel({ project }) {
  const [config,   setConfig]   = useState(null);   // null = 미설정
  const [view,     setView]     = useState("setup"); // "setup" | "settings" | "chat"
  const [loaded,   setLoaded]   = useState(false);

  /* 저장된 설정 불러오기 */
  useEffect(() => {
    const saved = loadAgentConfig();
    if (saved?.apiKey) {
      setConfig(saved);
      setView("chat");
    } else {
      setView("setup");
    }
    setLoaded(true);
  }, []);

  const handleSave = (newConfig) => {
    saveAgentConfig(newConfig);
    setConfig(newConfig);
    setView("chat");
  };

  const handleReset = () => {
    clearAgentConfig();
    setConfig(null);
    setView("setup");
  };

  if (!loaded) return null;

  return (
    <div style={{
      width:         PANEL_W,
      flexShrink:    0,
      height:        "100vh",
      display:       "flex",
      flexDirection: "column",
      background:    "var(--db-bg-base)",
      borderLeft:    "1px solid var(--db-border)",
      position:      "relative",
      zIndex:        2,
    }}>
      {/* ── 헤더 ── */}
      <div style={{
        height: 42, padding: "0 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--db-border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 6,
            background: "rgba(139,92,246,0.15)",
            border: "1px solid var(--db-border-mid)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, color: "var(--db-purple-300)",
          }}>✦</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--db-text-primary)", letterSpacing: ".04em" }}>
            Agent
          </span>
          {config && view === "chat" && (
            <span style={{
              fontSize: 10, padding: "1px 7px", borderRadius: 10,
              background: "var(--db-green-bg)", color: "var(--db-green)",
            }}>ON</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {config && (
            <button
              onClick={() => setView(v => v === "settings" ? "chat" : "settings")}
              title="API 설정"
              style={{
                width: 26, height: 26, borderRadius: 6,
                background: view === "settings" ? "rgba(139,92,246,0.15)" : "none",
                border: view === "settings" ? "1px solid var(--db-border-mid)" : "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: view === "settings" ? "var(--db-purple-300)" : "var(--db-text-muted)",
                transition: "all 0.15s",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── 컨텐츠 ── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {view === "setup" && (
          <div style={{ padding: 16 }}>
            <div style={{ textAlign: "center", padding: "20px 0 16px" }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, margin: "0 auto 12px",
                background: "rgba(139,92,246,0.1)",
                border: "1px solid var(--db-border-mid)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>✦</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--db-text-primary)", marginBottom: 6 }}>
                Agent 설정
              </p>
              <p style={{ fontSize: 12, color: "var(--db-text-muted)", lineHeight: 1.6 }}>
                API 키를 입력하면 AI와<br/>대화를 시작할 수 있어요
              </p>
            </div>
            <SettingsView onSave={handleSave} onCancel={null} existingConfig={null} />
          </div>
        )}

        {view === "settings" && (
          <div style={{ padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--db-text-muted)", letterSpacing: ".08em", marginBottom: 14 }}>
              API 설정
            </p>
            <SettingsView
              onSave={handleSave}
              onCancel={() => setView("chat")}
              existingConfig={config}
            />
            <button onClick={handleReset} style={{
              marginTop: 12, width: "100%", padding: "8px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 11, color: "var(--db-text-muted)",
            }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--db-red)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--db-text-muted)"}
            >
              API 키 초기화
            </button>
          </div>
        )}

        {view === "chat" && config && (
          <ChatView
            config={config}
            project={project}
            onOpenSettings={() => setView("settings")}
          />
        )}
      </div>
    </div>
  );
}
