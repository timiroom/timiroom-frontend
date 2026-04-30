"use client";

/**
 * AiChatSidebar.jsx
 * -----------------
 * 재사용 가능한 우측 AI 채팅 패널.
 * PRD / 기능 명세서 / API / ERD / QA 뷰에서 공통으로 사용.
 *
 * Props:
 *   contextType  "prd" | "features" | "api" | "erd" | "qa"
 *   onApplyDraft () => void   — 에디터에 초안 적용 콜백
 */

import { useState, useRef, useEffect } from "react";

const C = {
  bg:      "#1a1a1a",
  border:  "rgba(255,255,255,0.07)",
  text:    "#ececec",
  muted:   "#8b8b8b",
  sub:     "#555",
  accent:  "#a78bfa",
  inputBg: "#2f2f2f",
  inputBdr:"rgba(255,255,255,0.10)",
  commit:  "#7d4cfc",
};

/* ── 컨텍스트별 설정 ── */
const CTX = {
  prd: {
    subtitle:   "PRD 작성 도우미",
    greeting:   "안녕하세요! PRD 작성을 도와드릴게요.\n\n어떤 제품이나 기능을 기획 중이신가요? 간략하게 설명해 주시면 요구사항 정의서 초안을 작성해 드립니다.",
    draftTrig:  ["prd", "초안", "작성", "생성", "만들어", "써줘"],
    draftReply: "요구사항을 분석했습니다!\n\nPRD 초안을 생성했어요. 아래 버튼을 눌러 에디터에 적용해 보세요. 이후 자유롭게 수정하실 수 있습니다.",
    draftLabel: "PRD 초안 에디터에 적용",
    fallback:   "이해했습니다. 추가로 어떤 기능이나 제약사항이 있나요?\n\n충분한 정보가 모이면 PRD 초안을 자동 생성해 드릴게요.\n\n💡 \"PRD 작성해줘\" 라고 말씀하시면 바로 초안을 만들어 드립니다.",
  },
  features: {
    subtitle:   "기능 명세서 도우미",
    greeting:   "기능 명세서 작성을 도와드릴게요.\n\n어떤 기능들을 정의하고 싶으신가요? MoSCoW 우선순위나 사용자 스토리도 함께 정리해 드릴 수 있어요.",
    draftTrig:  ["기능", "feature", "명세", "초안", "작성", "생성", "만들어"],
    draftReply: "기능 목록을 분석했습니다!\n\n기능 명세서 초안을 생성했어요. 아래 버튼을 눌러 에디터에 적용해 보세요.",
    draftLabel: "기능 명세서 초안 적용",
    fallback:   "이해했습니다. 각 기능의 우선순위(Must/Should/Could/Won't)나 담당자를 명시하면 더 완성도 높은 명세서를 만들 수 있어요.\n\n💡 \"기능 명세서 작성해줘\" 라고 말씀하시면 초안을 바로 생성합니다.",
  },
  api: {
    subtitle:   "API 설계 도우미",
    greeting:   "API 명세서에 대해 질문하거나 새 엔드포인트 설계를 도와드릴게요.\n\n어떤 API 설계가 필요하신가요?",
    draftTrig:  ["api", "endpoint", "엔드포인트", "추가", "설계", "생성", "만들어"],
    draftReply: "API 설계를 완료했습니다!\n\n새 엔드포인트 명세를 작성했어요. 아래 버튼을 눌러 명세서에 추가해 보세요.",
    draftLabel: "API 명세 에디터에 적용",
    fallback:   "이해했습니다. RESTful 설계 원칙이나 인증 방식에 대해 더 구체적으로 말씀해 주시면 더 정확한 API 명세를 작성할 수 있어요.\n\n💡 \"API 설계해줘\" 라고 말씀하시면 엔드포인트를 바로 작성합니다.",
  },
  erd: {
    subtitle:   "ERD/DB 설계 도우미",
    greeting:   "ERD 및 데이터베이스 스키마 설계를 도와드릴게요.\n\n어떤 엔티티나 관계를 설계하고 싶으신가요?",
    draftTrig:  ["erd", "스키마", "schema", "테이블", "table", "설계", "만들어", "생성"],
    draftReply: "ERD 스키마를 설계했습니다!\n\n테이블 구조와 관계도 초안을 작성했어요. 아래 버튼을 눌러 에디터에 적용해 보세요.",
    draftLabel: "ERD 초안 에디터에 적용",
    fallback:   "이해했습니다. 엔티티 간 관계(1:N, N:M)와 핵심 속성을 알려주시면 더 완성도 높은 ERD를 설계할 수 있어요.\n\n💡 \"ERD 설계해줘\" 라고 말씀하시면 스키마를 바로 작성합니다.",
  },
  qa: {
    subtitle:   "QA 시나리오 도우미",
    greeting:   "QA 테스트 케이스 작성을 도와드릴게요.\n\n어떤 기능에 대한 테스트 케이스가 필요하신가요?",
    draftTrig:  ["qa", "테스트", "test", "케이스", "시나리오", "만들어", "작성"],
    draftReply: "QA 테스트 시나리오를 작성했습니다!\n\n테스트 케이스 초안을 생성했어요. 아래 버튼을 눌러 에디터에 적용해 보세요.",
    draftLabel: "QA 시나리오 에디터에 적용",
    fallback:   "이해했습니다. 정상 케이스(Happy Path)와 예외 케이스(Edge Case)를 모두 고려한 테스트 케이스를 작성해 드릴게요.\n\n💡 \"테스트 케이스 만들어줘\" 라고 말씀하시면 시나리오를 바로 작성합니다.",
  },
};

export function AiChatSidebar({ contextType = "prd", onApplyDraft }) {
  const ctx = CTX[contextType] || CTX.prd;

  const [messages,   setMessages]   = useState([{ role: "assistant", content: ctx.greeting }]);
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    await new Promise(r => setTimeout(r, 1200));

    const lc = text.toLowerCase();
    const isDraft = ctx.draftTrig.some(k => lc.includes(k));

    let reply;
    if (isDraft) {
      reply = ctx.draftReply;
      setDraftReady(true);
    } else {
      reply = ctx.fallback;
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
      width: 340, flexShrink: 0,
      display: "flex", flexDirection: "column",
      height: "100%",
      background: C.bg,
      borderLeft: `1px solid ${C.border}`,
    }}>
      {/* 헤더 */}
      <div style={{
        padding: "14px 16px",
        borderBottom: `1px solid ${C.border}`,
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
          <div style={{ fontSize: 11, color: C.muted }}>{ctx.subtitle}</div>
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
                  background: "#2f2f2f",
                  borderRadius: "14px 14px 4px 14px",
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
                <div style={{ maxWidth: "88%" }}>
                  <div style={{
                    padding: "2px 0 6px",
                    fontSize: 13, color: C.text, lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                  {/* 초안 적용 버튼 — 마지막 AI 메시지에만 */}
                  {draftReady && i === messages.length - 1 && (
                    <button
                      onClick={() => { onApplyDraft?.(); setDraftReady(false); }}
                      style={{
                        marginTop: 4, padding: "8px 14px",
                        background: C.commit, border: "none",
                        borderRadius: 8, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 7,
                        fontSize: 12, fontWeight: 700, color: "white",
                        transition: "opacity 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {ctx.draftLabel}
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
                  animation: `aics-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
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
            placeholder="질문하거나 초안을 요청해 보세요..."
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
              border: "none",
              cursor: input.trim() && !loading ? "pointer" : "not-allowed",
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
        @keyframes aics-dot {
          0%, 100% { transform: translateY(0);   opacity: 0.4; }
          50%       { transform: translateY(-4px); opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
