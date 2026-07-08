"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL, apiFetch } from "@/lib/authConfig";
import { createChatSession, sendChatMessage } from "@/lib/chatApi";
import { getOrCreateDefaultTeam } from "@/lib/teamApi";
import { createProject } from "@/lib/projectApi";

/* ═══════════════════════════════════════════
   파이프라인 진행 화면 상수 (ProgressScreen용)
════════════════════════════════════════════ */
const PIPELINE_STEPS = [
  { key: "PHASE1",  label: "RAG 준비",      icon: "📚" },
  { key: "SEARCH",  label: "시장 조사",      icon: "🔍" },
  { key: "PM",      label: "기능 분석",      icon: "📋" },
  { key: "PRD",     label: "PRD 작성",       icon: "📝" },
  { key: "DBA_API", label: "DB · API 설계", icon: "🔌" },
  { key: "QA",      label: "QA 검수",        icon: "🧪" },
  { key: "PHASE3",  label: "최종 검증",      icon: "✅" },
  { key: "PHASE4",  label: "결과 저장",      icon: "💾" },
];

const SSE_TO_STEP = {
  PHASE1_START: "PHASE1", PHASE1_DONE: "PHASE1",
  SEARCH: "SEARCH", PM: "PM",
  PRD: "PRD", PRD_ROLLBACK: "PRD",
  DBA_API: "DBA_API",
  QA: "QA", QA_RETRY: "QA",
  PHASE3: "PHASE3",
  PHASE4: "PHASE4",
};

const ROW1    = PIPELINE_STEPS.slice(0, 4);
const ROW2    = PIPELINE_STEPS.slice(4);
const NODE_W  = 110;
const ARROW_W = 36;
const ROW_W   = ROW1.length * NODE_W + (ROW1.length - 1) * ARROW_W;

function FlowArrow({ active, flip }) {
  const col  = active ? "var(--db-purple-400)" : "var(--border)";
  const dash = active ? undefined : "5 4";
  return (
    <div style={{ display: "flex", alignItems: "center", flexShrink: 0, width: ARROW_W, transform: flip ? "scaleX(-1)" : undefined }}>
      <svg width={ARROW_W} height="18" viewBox={`0 0 ${ARROW_W} 18`} fill="none">
        <line x1="2" y1="9" x2="26" y2="9" stroke={col} strokeWidth="2" strokeDasharray={dash} strokeLinecap="round"/>
        <polyline points="18,3 28,9 18,15" stroke={col} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function FlowDown({ active }) {
  const col      = active ? "var(--db-purple-400)" : "var(--border)";
  const dash     = active ? undefined : "5 4";
  const rightPad = NODE_W / 2 - 9;
  return (
    <div style={{ width: ROW_W, display: "flex", justifyContent: "flex-end", paddingRight: rightPad }}>
      <svg width="18" height="36" viewBox="0 0 18 36" fill="none">
        <line x1="9" y1="2" x2="9" y2="26" stroke={col} strokeWidth="2" strokeDasharray={dash} strokeLinecap="round"/>
        <polyline points="3,18 9,28 15,18" stroke={col} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function FlowNode({ step, status }) {
  const isDone    = status === "done";
  const isRunning = status === "running";
  return (
    <div style={{ width: NODE_W, flexShrink: 0 }}>
      <div style={{
        width: "100%", padding: "12px 6px 10px",
        background: isDone ? "rgba(52,211,153,0.07)" : isRunning ? "rgba(107,85,220,0.12)" : "var(--surface)",
        border: `2px solid ${isDone ? "rgba(52,211,153,0.5)" : isRunning ? "var(--db-purple-400)" : "var(--border)"}`,
        borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        transition: "all 0.4s",
        boxShadow: isRunning ? "0 0 20px rgba(107,85,220,0.28)" : "none",
        position: "relative",
      }}>
        {isDone && (
          <div style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", background: "#34d399", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--db-bg-primary)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        )}
        {isRunning && (
          <div style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", background: "var(--db-purple-600)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--db-bg-primary)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: "prog-spin 0.9s linear infinite" }}>
              <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
            </svg>
          </div>
        )}
        <span style={{ fontSize: 22, opacity: isDone ? 0.6 : isRunning ? 1 : 0.3, transition: "opacity 0.3s" }}>{step.icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, textAlign: "center", lineHeight: 1.35, color: isDone ? "var(--text-2)" : isRunning ? "var(--text-1)" : "var(--text-3)", transition: "color 0.3s" }}>{step.label}</span>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 100, background: isDone ? "rgba(52,211,153,0.15)" : isRunning ? "rgba(107,85,220,0.2)" : "rgba(255,255,255,0.04)", color: isDone ? "#34d399" : isRunning ? "var(--db-purple-300)" : "var(--text-3)", transition: "all 0.3s" }}>
          {isDone ? "완료" : isRunning ? "실행 중" : "대기"}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ProgressScreen
════════════════════════════════════════════ */
export function ProgressScreen({ pipelineId, onComplete, onCancel }) {
  const [percent,    setPercent]    = useState(5);
  const [phase,      setPhase]      = useState("running");
  const [errMsg,     setErrMsg]     = useState(null);
  const [statuses,   setStatuses]   = useState(() =>
    Object.fromEntries(PIPELINE_STEPS.map(s => [s.key, "waiting"]))
  );
  const [currentMsg, setCurrentMsg] = useState("파이프라인 준비 중...");
  const currentKeyRef = useRef(null);
  const doneRef       = useRef(false);

  useEffect(() => {
    // MOCK: Simulate SSE progress
    let currentStepIndex = 0;
    const interval = setInterval(() => {
      const step = PIPELINE_STEPS[currentStepIndex];
      const newKey = step.key;
      setPercent(Math.floor(((currentStepIndex + 1) / PIPELINE_STEPS.length) * 100));
      setCurrentMsg(`${step.label} 진행 중...`);
      
      if (newKey && newKey !== currentKeyRef.current) {
        const prevKey = currentKeyRef.current;
        currentKeyRef.current = newKey;
        setStatuses(prev => {
          const next = { ...prev };
          if (prevKey) next[prevKey] = "done";
          next[newKey] = "running";
          return next;
        });
      }
      
      currentStepIndex++;
      if (currentStepIndex >= PIPELINE_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setPercent(100);
          setPhase("done");
          setCurrentMsg("모든 단계 완료!");
          setStatuses(Object.fromEntries(PIPELINE_STEPS.map(s => [s.key, "done"])));
          setTimeout(() => onComplete({
            prdDocument: {
              projectOverview: "WalkMyDog: 반려견 산책 매칭 서비스",
              background: "바쁜 현대인을 위해 안전하고 신뢰할 수 있는 반려견 산책 파트너를 매칭해주는 플랫폼 필요",
              goals: ["사용자-펫시터 간 매칭 소요시간 최소화", "실시간 위치 추적을 통한 신뢰성 확보"],
              kpi: [{ metric: "MAU", target: "10,000", basis: "출시 3개월 내" }],
              coreFeatures: [
                { name: "견주-펫시터 매칭", priority: "P0", description: "GPS 기반 근거리 매칭", requirements: ["사용자 위치 기반 탐색", "필터링 (시간, 가격)"] },
                { name: "실시간 위치 추적", priority: "P0", description: "산책 중인 반려견의 실시간 위치 지도 표시", requirements: ["Google Maps API 연동", "위치 데이터 5초 주기 갱신"] },
                { name: "에스크로 안전 결제", priority: "P1", description: "매칭 확정 시 결제, 완료 시 정산", requirements: ["Stripe 결제 연동", "산책 완료 버튼 클릭 시 정산 승인"] }
              ],
              userPersonas: [
                { name: "김바쁨", age: "32", job: "직장인", goal: "믿고 맡길 수 있는 펫시터를 빠르게 찾고 싶음", painPoint: "야근 잦아 산책시킬 시간이 부족함" }
              ],
              techStack: { Frontend: "Next.js, React", Backend: "Spring Boot", DB: "PostgreSQL", Map: "Google Maps API" },
              mvpScope: { included: ["매칭", "결제", "위치 추적"], excluded: ["산책 일지", "커뮤니티"], rationale: "핵심 가치인 신뢰할 수 있는 매칭과 안전에 집중" }
            },
            dbSchema: {
              tables: [
                {
                  name: "users",
                  columns: [
                    { name: "id", type: "BIGINT", constraints: "PK" },
                    { name: "email", type: "VARCHAR(255)", constraints: "NOT NULL, UNIQUE" },
                    { name: "role", type: "VARCHAR(20)", constraints: "NOT NULL" }
                  ],
                  indexes: ["idx_users_email"]
                },
                {
                  name: "walk_requests",
                  columns: [
                    { name: "id", type: "BIGINT", constraints: "PK" },
                    { name: "owner_id", type: "BIGINT", constraints: "FK" },
                    { name: "sitter_id", type: "BIGINT", constraints: "FK" },
                    { name: "status", type: "VARCHAR(20)", constraints: "NOT NULL" }
                  ],
                  indexes: ["idx_walk_status"]
                },
                {
                  name: "location_logs",
                  columns: [
                    { name: "id", type: "BIGINT", constraints: "PK" },
                    { name: "walk_id", type: "BIGINT", constraints: "FK" },
                    { name: "latitude", type: "DECIMAL(10,8)", constraints: "NOT NULL" },
                    { name: "longitude", type: "DECIMAL(11,8)", constraints: "NOT NULL" }
                  ]
                }
              ],
              relationships: [
                "users (owner_id) 1:N walk_requests",
                "users (sitter_id) 1:N walk_requests",
                "walk_requests 1:N location_logs"
              ]
            },
            apiSpec: {
              endpoints: [
                {
                  method: "POST",
                  path: "/api/walk-requests",
                  description: "견주가 새로운 산책 매칭을 요청합니다.",
                  summary: "산책 요청 생성",
                  request: {
                    headers: { Authorization: "Bearer JWT" },
                    body: { location: "string", startTime: "ISO8601", duration: "number" }
                  },
                  response: {
                    success: { requestId: "number", status: "PENDING" },
                    error: "400 Bad Request"
                  }
                },
                {
                  method: "GET",
                  path: "/api/walk-requests/{id}/location",
                  description: "진행 중인 산책의 현재 위치(GPS)를 반환합니다.",
                  summary: "실시간 위치 조회",
                  request: { headers: { Authorization: "Bearer JWT" } },
                  response: {
                    success: { latitude: "number", longitude: "number", updatedAt: "ISO8601" }
                  }
                }
              ],
              authentication: "Bearer Token"
            },
            featureList: [
              "견주-펫시터 실시간 근거리 매칭",
              "Google Maps 기반 실시간 산책 위치 추적",
              "Stripe 에스크로 안전 결제 및 자동 정산",
              "펫시터 리뷰 및 평점 시스템",
              "산책 일지 기록 및 공유 기능"
            ],
          }), 1500);
        }, 500);
      }
    }, 800);
    
    return () => clearInterval(interval);
  }, [pipelineId, onComplete]);

  const isAct       = (key) => statuses[key] === "done";
  const accentColor = phase === "error" ? "#f87171" : phase === "done" ? "#34d399" : "var(--db-purple-400)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--db-bg-primary)" }}>
      <div style={{ height: 36, background: "var(--bg)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", paddingLeft: 16, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", height: "100%", borderRight: "1px solid var(--border)", borderBottom: `2px solid ${accentColor}`, background: "var(--db-bg-primary)", fontSize: 12, color: "var(--text-2)" }}>
          <span style={{ fontSize: 14 }}>✦</span>
          {phase === "done" ? "생성 완료" : phase === "error" ? "생성 실패" : "프로젝트 생성 중..."}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 40px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                {phase === "done" ? "✅ 생성 완료! 잠시 후 이동합니다..." : phase === "error" ? "❌ 생성 실패" : "파이프라인 실행 중..."}
              </span>
              <span style={{ fontSize: 20, fontWeight: 900, color: accentColor, fontVariantNumeric: "tabular-nums", transition: "color 0.3s" }}>{percent}%</span>
            </div>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 100, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${percent}%`, background: phase === "error" ? "#f87171" : phase === "done" ? "#34d399" : "linear-gradient(90deg, var(--db-purple-600), var(--db-purple-400))", borderRadius: 100, transition: "width 0.6s ease, background 0.3s", boxShadow: phase === "running" ? "0 0 8px var(--db-purple-400)" : "none" }}/>
            </div>
            {phase === "error" && errMsg && <div style={{ marginTop: 8, fontSize: 12, color: "#f87171" }}>{errMsg}</div>}
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "28px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", width: ROW_W }}>
              {ROW1.flatMap((step, idx) => {
                const nodes = [<FlowNode key={step.key} step={step} status={statuses[step.key]} />];
                if (idx < ROW1.length - 1) nodes.push(<FlowArrow key={`r1-${idx}`} active={isAct(ROW1[idx].key)} />);
                return nodes;
              })}
            </div>
            <FlowDown active={isAct("PRD")} />
            <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", width: ROW_W }}>
              {ROW2.flatMap((step, idx) => {
                const nodes = [<FlowNode key={step.key} step={step} status={statuses[step.key]} />];
                if (idx < ROW2.length - 1) nodes.push(<FlowArrow key={`r2-${idx}`} active={isAct(ROW2[idx].key)} flip />);
                return nodes;
              })}
            </div>
          </div>
          {phase === "running" && currentMsg && (
            <div style={{ padding: "10px 16px", background: "rgba(107,85,220,0.08)", border: "1px solid rgba(107,85,220,0.18)", borderRadius: 8, fontSize: 12, color: "var(--db-purple-300)", fontFamily: "'JetBrains Mono', monospace" }}>
              ▸ {currentMsg}
            </div>
          )}
          {phase === "error" && (
            <div style={{ textAlign: "center" }}>
              <button onClick={onCancel} style={{ padding: "10px 28px", borderRadius: 8, background: "var(--border)", border: "none", color: "var(--text-2)", fontSize: 13, cursor: "pointer" }}>
                돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes prog-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════
   채팅 메시지 버블
════════════════════════════════════════════ */
function formatMarkdown(text) {
  if (!text) return { __html: "" };
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.15);padding:2px 4px;border-radius:4px;font-family:monospace;font-size:0.9em">$1</code>');
  return { __html: html };
}

function MessageBubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 8 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "var(--text-1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 10, alignSelf: "flex-end", color: "var(--bg)", fontWeight: 800 }}>A</div>
      )}
      <div 
        style={{
          maxWidth: "72%", padding: "12px 16px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser ? "var(--text-1)" : "var(--surface)",
          border: isUser ? "none" : "1px solid var(--border)",
          color: isUser ? "#fff" : "var(--text-1)", fontSize: 14, lineHeight: 1.6,
          boxShadow: isUser ? "var(--db-glow-sm)" : "none",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={formatMarkdown(content)}
      />
      {isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "var(--text-1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--bg)", marginLeft: 10, alignSelf: "flex-end" }}>나</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   제안 버튼 (어시스턴트 메시지 아래)
════════════════════════════════════════════ */
function SuggestionChips({ suggestions, onSelect, disabled }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 8,
      paddingLeft: 42, // 아바타(32) + gap(10) 만큼 들여쓰기
      marginBottom: 16, marginTop: 6,
    }}>
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => !disabled && onSelect(s)}
          disabled={disabled}
          style={{
            padding: "7px 14px",
            borderRadius: 100,
            border: "1px solid var(--db-border-mid)",
            background: "var(--surface)",
            color: disabled ? "var(--text-3)" : "var(--text-2)",
            fontSize: 12, cursor: disabled ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            textAlign: "left", lineHeight: 1.4,
            opacity: disabled ? 0.5 : 1,
          }}
          onMouseEnter={e => {
            if (!disabled) {
              e.currentTarget.style.borderColor = "var(--db-purple-400)";
              e.currentTarget.style.color = "var(--db-purple-300)";
              e.currentTarget.style.background = "rgba(107,85,220,0.08)";
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "var(--db-border-mid)";
            e.currentTarget.style.color = disabled ? "var(--text-3)" : "var(--text-2)";
            e.currentTarget.style.background = "var(--surface)";
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   로딩 점 애니메이션
════════════════════════════════════════════ */
function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--text-1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, boxShadow: "var(--db-glow-sm)", flexShrink: 0, color: "var(--bg)", fontWeight: 800 }}>A</div>
      <div style={{
        padding: "16px", background: "var(--surface)", borderRadius: "18px 18px 18px 4px",
        border: "1px solid var(--border)", display: "flex", gap: 5, alignItems: "center"
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--db-purple-400)", animation: `dot-bounce 1.2s ${i * 0.2}s infinite ease-in-out` }}/>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   메인 — ProjectChatWizard
════════════════════════════════════════════ */
export function ProjectChatWizard({ onPipelineStart, onCancel }) {
  const [messages,          setMessages]          = useState([]);
  const [currentSuggestions,setCurrentSuggestions]= useState([]);
  const [inputText,         setInputText]         = useState("");
  const [isLoading,         setIsLoading]         = useState(false);
  const [sessionId,         setSessionId]         = useState(null);
  const [sessionError,      setSessionError]      = useState(null);
  const [isSubmitting,      setIsSubmitting]      = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // 세션 생성 + 첫 인사 (MOCK)
  useEffect(() => {
    async function init() {
      setTimeout(() => {
        setSessionId("mock-session-id");
        setMessages([{
          role: "assistant",
          content: "안녕하세요! Align-it 입니다. 머릿속에 있는 아이디어를 말씀해 주시면, 제가 실제 작동하는 서비스로 만들어 드릴게요. 어떤 서비스를 만들고 싶으신가요?",
        }]);
      }, 300);
    }
    init();
  }, []);

  // 새 메시지 올 때 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 파이프라인 시작 (MOCK)
  const triggerPipeline = useCallback(async (formData) => {
    setIsSubmitting(true);
    setTimeout(() => {
      const mockPipelineId = "mock-pipeline-" + Date.now();
      const mockProjectId = "mock-project-" + Date.now();
      onPipelineStart(mockPipelineId, mockProjectId, formData.projectName);
    }, 1500);
  }, [onPipelineStart]);

  const sendText = useCallback(async (text) => {
    if (!text.trim() || !sessionId || isLoading || isSubmitting) return;

    const currentLen = messages.length;
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setCurrentSuggestions([]);
    setInputText("");
    setIsLoading(true);

    setTimeout(() => {
      let response = {};
      
      if (currentLen === 1) {
        // 첫 번째 답변: 플랫폼 질문
        response = {
          message: `"${text}" 서비스 기획을 시작하겠습니다! 첫 번째 질문입니다. 이 서비스는 모바일 앱(iOS/Android)으로 구현할 계획이신가요, 아니면 웹 서비스로 먼저 시작할 계획이신가요?`,
          isComplete: false,
          suggestions: ["접근성이 좋은 모바일 앱으로 만들어줘", "반응형 웹 서비스로 먼저 시작할래", "앱과 웹 모두 필요해"]
        };
      } else if (currentLen === 3) {
        // 두 번째 답변: 기술 스택 질문
        response = {
          message: "좋습니다! 두 번째 질문입니다. 백엔드(서버/데이터베이스) 구현과 관련하여 선호하시는 기술 스택이 있으신가요?",
          isComplete: false,
          suggestions: ["Node.js와 MongoDB로 빠르고 가볍게 갈래", "안정적인 Spring Boot와 MySQL로 구축해줘", "가장 적합한 최신 스택으로 알아서 추천해줘"]
        };
      } else if (currentLen === 5) {
        // 세 번째 답변: 인증 방식 질문
        response = {
          message: "기술 스택 요구사항을 반영하겠습니다! 마지막 구현 질문입니다. 서비스의 사용자 인증(로그인) 방식은 어떻게 구성하는 것이 좋을까요?",
          isComplete: false,
          suggestions: ["카카오/네이버/구글 소셜 로그인이 필수야", "일단 기본적인 이메일 회원가입만 있으면 돼", "소셜 로그인과 이메일 둘 다 포함해줘"]
        };
      } else if (currentLen >= 7) {
        // 완료 단계
        response = {
          message: "네, 알겠습니다! 답변해주신 구현 세부사항(플랫폼, 기술 스택, 인증 방식)을 모두 반영하여 지금 바로 전체 서비스 기획 및 설계를 시작하겠습니다. 잠시만 기다려 주세요...",
          isComplete: true,
          formData: {
            projectName: "신규 서비스 기획",
            projectDescription: "사용자가 요청한 맞춤형 플랫폼 및 기술 스택 기반 서비스"
          }
        };
      } else {
        response = {
          message: "말씀하신 내용을 바탕으로 추가 기획을 진행합니다. 더 필요하신 구현 제약 사항이 있으신가요?",
          isComplete: false,
          suggestions: ["이대로 진행해줘"]
        };
        if (text.includes("이대로") || text.includes("진행")) {
          response.isComplete = true;
          response.formData = { projectName: "신규 서비스", projectDescription: "" };
        }
      }

      setMessages(prev => [...prev, { role: "assistant", content: response.message }]);
      setCurrentSuggestions(response.suggestions ?? []);

      if (response.isComplete && response.formData) {
        setCurrentSuggestions([]);
        setTimeout(() => triggerPipeline(response.formData), 1500);
      }
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 1500);
  }, [messages.length, sessionId, isLoading, isSubmitting, triggerPipeline]);

  const handleSend = useCallback(() => {
    sendText(inputText.trim());
  }, [inputText, sendText]);

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = inputText.trim() && !isLoading && !isSubmitting && !sessionError;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--db-bg-primary)" }}>

      {/* 탭 바 */}
      <div style={{ height: 36, background: "var(--bg)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: 16, paddingRight: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 14px", height: "100%", borderRight: "1px solid var(--border)", borderBottom: "2px solid var(--db-purple-400)", background: "var(--db-bg-primary)", fontSize: 12, color: "var(--text-2)" }}>
          <span style={{ fontSize: 14 }}>✦</span>
          새 프로젝트 만들기
        </div>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "var(--text-3)", fontSize: 16, cursor: "pointer", padding: "4px 8px", borderRadius: 4 }} title="닫기">✕</button>
      </div>

      {/* 에러 */}
      {sessionError && (
        <div style={{ padding: 20, color: "#f87171", fontSize: 13, textAlign: "center" }}>{sessionError}</div>
      )}

      {/* 채팅 영역 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px" }}>

          {/* 첫 화면 안내 */}
          {messages.length <= 1 && (
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💡</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)", marginBottom: 8 }}>
                어떤 서비스를 만들고 싶으신가요?
              </div>
              <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.7 }}>
                아이디어를 자연스럽게 이야기해 주시면<br/>
                Claude가 필요한 정보를 물어보며 프로젝트를 함께 기획합니다.
              </div>
            </div>
          )}

          {/* 메시지 목록 */}
          {messages.map((msg, i) => (
            <MessageBubble key={i} role={msg.role} content={msg.content} />
          ))}

          {/* 로딩 중 */}
          {(isLoading || isSubmitting) && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 입력창 */}
      <div style={{ padding: "12px 24px 20px", background: "var(--db-bg-primary)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          {/* Claude 제안 버튼 — 입력창 바로 위, 폼과 동일 너비 */}
          {currentSuggestions.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
              {currentSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendText(s)}
                  disabled={isLoading || isSubmitting}
                  style={{
                    width: "100%", padding: "9px 14px",
                    borderRadius: 10, textAlign: "left",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "var(--text-2)",
                    fontSize: 13, lineHeight: 1.5,
                    cursor: isLoading || isSubmitting ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                    opacity: isLoading || isSubmitting ? 0.5 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!isLoading && !isSubmitting) {
                      e.currentTarget.style.borderColor = "rgba(107,85,220,0.45)";
                      e.currentTarget.style.color = "var(--db-purple-300)";
                      e.currentTarget.style.background = "rgba(107,85,220,0.1)";
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.color = "var(--text-2)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div
            style={{ display: "flex", alignItems: "flex-end", gap: 10, background: "var(--surface)", border: "1px solid var(--db-border-mid)", borderRadius: 16, padding: "10px 12px 10px 16px", transition: "border-color 0.15s" }}
            onFocusCapture={e => e.currentTarget.style.borderColor = "var(--db-purple-400)"}
            onBlurCapture={e => e.currentTarget.style.borderColor = "var(--db-border-mid)"}
          >
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="위에서 선택하거나 직접 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
              disabled={isLoading || isSubmitting || !!sessionError}
              rows={1}
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text-1)", fontSize: 14, resize: "none", fontFamily: "inherit", lineHeight: 1.6, maxHeight: 120, overflowY: "auto" }}
              onInput={e => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
            />
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: canSend ? "var(--text-1)" : "var(--border)",
                border: "none", cursor: canSend ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
                boxShadow: canSend ? "var(--db-glow-sm)" : "none",
              }}
              title="전송 (Enter)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", marginTop: 8 }}>
            Claude가 대화를 통해 프로젝트 정보를 수집하고 자동으로 기획서를 생성합니다
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes prog-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
