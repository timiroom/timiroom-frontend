"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { API_BASE_URL, apiFetch } from "@/lib/authConfig";
import { createChatSession, sendChatMessage, validateFile, isImageFile, MAX_FILES, ALLOWED_EXTENSIONS } from "@/lib/chatApi";
import { restartPipeline } from "@/lib/pipelineApi";
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
export function ProgressScreen({ pipelineId: initialPipelineId, onComplete, onCancel }) {
  const [pipelineId, setPipelineId] = useState(initialPipelineId);
  const [percent,    setPercent]    = useState(5);
  const [phase,      setPhase]      = useState("running");
  const [errMsg,     setErrMsg]     = useState(null);
  const [statuses,   setStatuses]   = useState(() =>
    Object.fromEntries(PIPELINE_STEPS.map(s => [s.key, "waiting"]))
  );
  const [currentMsg,  setCurrentMsg]  = useState("파이프라인 준비 중...");
  const [restarting,  setRestarting]  = useState(false);
  const currentKeyRef = useRef(null);
  const doneRef       = useRef(false);

  /* ── SSE 연결 ── */
  useEffect(() => {
    // 상태 초기화
    setPercent(5);
    setPhase("running");
    setErrMsg(null);
    setCurrentMsg("파이프라인 준비 중...");
    setStatuses(Object.fromEntries(PIPELINE_STEPS.map(s => [s.key, "waiting"])));
    currentKeyRef.current = null;
    doneRef.current = false;

    const es = new EventSource(
      `${API_BASE_URL}/api/v1/pipeline/progress/${pipelineId}`,
      { withCredentials: true }
    );
    es.addEventListener("progress", (e) => {
      const d      = JSON.parse(e.data);
      const newKey = SSE_TO_STEP[d.step];
      setPercent(d.percent || 0);
      setCurrentMsg(d.message || "");
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
    });
    es.addEventListener("complete", (e) => {
      doneRef.current = true;
      const d = JSON.parse(e.data);
      setPercent(100);
      setPhase("done");
      setCurrentMsg("모든 단계 완료!");
      setStatuses(Object.fromEntries(PIPELINE_STEPS.map(s => [s.key, "done"])));
      es.close();
      setTimeout(() => onComplete(d.result), 1500);
    });
    es.addEventListener("error", (e) => {
      doneRef.current = true;
      try { setErrMsg(JSON.parse(e.data).message); }
      catch { setErrMsg("파이프라인 오류가 발생했습니다"); }
      setPhase("error");
      es.close();
    });
    es.onerror = () => {
      if (doneRef.current || es.readyState === EventSource.CLOSED) return;
      setErrMsg("서버 연결이 끊어졌습니다.");
      setPhase("error");
      es.close();
    };
    return () => es.close();
  }, [pipelineId, onComplete]);

  /* ── 재시작 핸들러 ── */
  async function handleRestart() {
    setRestarting(true);
    try {
      const result = await restartPipeline(pipelineId);
      const newId  = result.pipelineId ?? result.data?.pipelineId ?? pipelineId;
      // pipelineId가 바뀌면 useEffect 재실행 → SSE 재연결
      // 같은 ID면 강제 재마운트를 위해 상태를 직접 초기화
      if (newId !== pipelineId) {
        setPipelineId(newId);
      } else {
        // 동일 ID 재시작: 상태만 리셋하고 SSE 재연결은 키를 바꿔서 처리
        setPipelineId(null);
        setTimeout(() => setPipelineId(newId), 0);
      }
    } catch (e) {
      setErrMsg(e.message || "재시작에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setRestarting(false);
    }
  }

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
            <div style={{ textAlign: "center", display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={onCancel}
                style={{
                  padding: "10px 24px", borderRadius: 8,
                  background: "var(--border)", border: "none",
                  color: "var(--text-2)", fontSize: 13, cursor: "pointer",
                }}
              >
                돌아가기
              </button>
              <button
                onClick={handleRestart}
                disabled={restarting}
                style={{
                  padding: "10px 24px", borderRadius: 8,
                  background: restarting ? "rgba(107,85,220,0.4)" : "var(--db-grad-purple)",
                  border: "none", color: "white",
                  fontSize: 13, fontWeight: 700,
                  cursor: restarting ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.2s",
                  boxShadow: restarting ? "none" : "var(--db-glow-sm)",
                }}
              >
                {restarting ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                      style={{ animation: "prog-spin 0.9s linear infinite" }}>
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                    </svg>
                    재시작 중...
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    다시 시작
                  </>
                )}
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
function FileChip({ file, onRemove, preview }) {
  const isImg = isImageFile(file);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "4px 8px 4px 6px",
      background: "rgba(107,85,220,0.1)",
      border: "1px solid rgba(107,85,220,0.25)",
      borderRadius: 8, fontSize: 12, color: "var(--text-2)",
      maxWidth: 180,
    }}>
      {isImg && preview ? (
        <Image src={preview} alt="" width={20} height={20}
          style={{ borderRadius: 4, objectFit: "cover", flexShrink: 0 }} unoptimized />
      ) : (
        <span style={{ fontSize: 14, flexShrink: 0 }}>
          {ALLOWED_EXTENSIONS[file.type]?.icon ?? "📎"}
        </span>
      )}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
        {file.name}
      </span>
      {onRemove && (
        <button
          onClick={onRemove}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 0, display: "flex", alignItems: "center", flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}

function MessageBubble({ role, content, files }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 8 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "var(--db-grad-purple)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 10, alignSelf: "flex-end", boxShadow: "var(--db-glow-sm)" }}>A</div>
      )}
      <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 6 }}>
        {/* 첨부 파일 미리보기 */}
        {files && files.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: isUser ? "flex-end" : "flex-start" }}>
            {files.map((f, i) => (
              <FileChip key={i} file={f.file} preview={f.preview} />
            ))}
          </div>
        )}
        {/* 텍스트 버블 */}
        {content && (
          <div style={{
            padding: "12px 16px",
            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isUser ? "var(--db-grad-purple)" : "var(--surface)",
            border: isUser ? "none" : "1px solid var(--border)",
            color: isUser ? "#fff" : "var(--text-1)", fontSize: 14, lineHeight: 1.6,
            boxShadow: isUser ? "var(--db-glow-sm)" : "none",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {content}
          </div>
        )}
      </div>
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
    <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 16, gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--db-grad-purple)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, boxShadow: "var(--db-glow-sm)", flexShrink: 0 }}>A</div>
      <div style={{ padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "18px 18px 18px 4px", display: "flex", gap: 5, alignItems: "center" }}>
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
  // 파일 첨부
  const [attachedFiles,     setAttachedFiles]     = useState([]); // [{ file, preview }]
  const [fileError,         setFileError]         = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const fileInputRef   = useRef(null);

  /* ── 파일 선택 핸들러 ── */
  const handleFileSelect = useCallback((e) => {
    const selected = Array.from(e.target.files);
    setFileError(null);
    const next = [...attachedFiles];

    for (const file of selected) {
      if (next.length >= MAX_FILES) {
        setFileError(`파일은 최대 ${MAX_FILES}개까지 첨부할 수 있습니다.`);
        break;
      }
      const err = validateFile(file);
      if (err) { setFileError(err); continue; }

      const preview = isImageFile(file) ? URL.createObjectURL(file) : null;
      next.push({ file, preview });
    }
    setAttachedFiles(next);
    e.target.value = "";
  }, [attachedFiles]);

  /* ── 파일 제거 ── */
  const removeFile = useCallback((idx) => {
    setAttachedFiles(prev => {
      const copy = [...prev];
      if (copy[idx]?.preview) URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      return copy;
    });
    setFileError(null);
  }, []);

  // 세션 생성 + 첫 인사
  useEffect(() => {
    async function init() {
      try {
        const { sessionId: sid } = await createChatSession();
        setSessionId(sid);
        setMessages([{
          role: "assistant",
          content: "안녕하세요! 어떤 서비스를 만들고 싶으신가요? 아이디어를 자유롭게 말씀해 주세요.",
        }]);
        // 첫 메시지는 사용자가 직접 입력 — 제안 없음
      } catch {
        setSessionError("채팅 세션을 시작하지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      }
    }
    init();
  }, []);

  // 새 메시지 올 때 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 파이프라인 시작
  const triggerPipeline = useCallback(async (formData) => {
    setIsSubmitting(true);
    try {
      const team    = await getOrCreateDefaultTeam();
      const teamId  = team.teamId ?? team.id;
      const project = await createProject({
        teamId,
        projectName: formData.projectName,
        description: formData.projectDescription,
      });

      const reqRes = await apiFetch(`${API_BASE_URL}/api/v1/requirements`, {
        method: "POST",
        body: JSON.stringify({
          projectId: Number(project.id),
          title:     formData.projectName,
          content:   JSON.stringify(formData),
        }),
      });
      if (!reqRes || !reqRes.ok) throw new Error(`요구사항 생성 실패 (HTTP ${reqRes?.status})`);
      const requirement   = await reqRes.json();
      const requirementId = requirement.requirementId;

      const pipeRes = await apiFetch(
        `${API_BASE_URL}/api/v1/pipeline/start/${requirementId}`,
        { method: "POST", body: new FormData() }
      );
      if (!pipeRes || !pipeRes.ok) throw new Error(`파이프라인 시작 실패 (HTTP ${pipeRes?.status})`);

      const pipeResult = await pipeRes.json();
      const id = pipeResult.pipelineId ?? pipeResult.data?.pipelineId;
      if (!id) throw new Error("pipelineId를 받지 못했습니다");

      onPipelineStart(id, String(project.id), formData.projectName);
    } catch (err) {
      console.error("파이프라인 실행 실패:", err);
      setIsSubmitting(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `프로젝트 생성 중 오류가 발생했습니다: ${err.message}. 다시 시도해 주세요.`,
      }]);
    }
  }, [onPipelineStart]);

  // text를 직접 받아서 전송 (제안 클릭 시 사용)
  const sendText = useCallback(async (text) => {
    if (!text.trim() || !sessionId || isLoading || isSubmitting) return;

    const filesToSend = attachedFiles.map(f => f.file);
    const filesMeta   = attachedFiles.map(f => ({ file: f.file, preview: f.preview }));

    setMessages(prev => [...prev, { role: "user", content: text, files: filesMeta }]);
    setCurrentSuggestions([]);
    setInputText("");
    setAttachedFiles([]);
    setFileError(null);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(sessionId, text, filesToSend);
      setMessages(prev => [...prev, { role: "assistant", content: response.message }]);
      setCurrentSuggestions(response.suggestions ?? []);

      if (response.isComplete && response.formData) {
        setCurrentSuggestions([]);
        setTimeout(() => triggerPipeline(response.formData), 1000);
      }
    } catch (err) {
      console.error("메시지 전송 실패:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "일시적인 오류가 발생했습니다. 다시 시도해 주세요.",
      }]);
      setCurrentSuggestions([]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [sessionId, isLoading, isSubmitting, triggerPipeline, attachedFiles]);

  const handleSend = useCallback(() => {
    sendText(inputText.trim());
  }, [inputText, sendText]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (inputText.trim() || attachedFiles.length > 0) && !isLoading && !isSubmitting && !sessionError;

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
            <MessageBubble key={i} role={msg.role} content={msg.content} files={msg.files} />
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
          {/* 파일 입력 (숨김) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={Object.keys(ALLOWED_EXTENSIONS).join(",")}
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />

          {/* 첨부 파일 미리보기 */}
          {attachedFiles.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {attachedFiles.map((f, i) => (
                <FileChip key={i} file={f.file} preview={f.preview} onRemove={() => removeFile(i)} />
              ))}
            </div>
          )}

          {/* 파일 에러 */}
          {fileError && (
            <div style={{ fontSize: 11, color: "#f87171", marginBottom: 6 }}>{fileError}</div>
          )}

          <div
            style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface)", border: "1px solid var(--db-border-mid)", borderRadius: 16, padding: "10px 10px 10px 14px", transition: "border-color 0.15s" }}
            onFocusCapture={e => e.currentTarget.style.borderColor = "var(--db-purple-400)"}
            onBlurCapture={e => e.currentTarget.style.borderColor = "var(--db-border-mid)"}
          >
            {/* 파일 첨부 버튼 */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isSubmitting || !!sessionError || attachedFiles.length >= MAX_FILES}
              title={`파일 첨부 (최대 ${MAX_FILES}개, PDF·이미지·텍스트·JSON 지원)`}
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: "none", border: "none",
                cursor: isLoading || isSubmitting || attachedFiles.length >= MAX_FILES ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: attachedFiles.length > 0 ? "var(--db-purple-400)" : "var(--text-3)",
                transition: "all 0.15s",
                position: "relative",
              }}
              onMouseEnter={e => { if (!isLoading && !isSubmitting) e.currentTarget.style.color = "var(--db-purple-300)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = attachedFiles.length > 0 ? "var(--db-purple-400)" : "var(--text-3)"; }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              {attachedFiles.length > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2,
                  width: 14, height: 14, borderRadius: "50%",
                  background: "var(--db-purple-400)", color: "white",
                  fontSize: 9, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {attachedFiles.length}
                </span>
              )}
            </button>

            <textarea
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="위에서 선택하거나 직접 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
              disabled={isLoading || isSubmitting || !!sessionError}
              rows={1}
              className="chat-textarea"
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text-1)", fontSize: 14, resize: "none", fontFamily: "inherit", lineHeight: 1.6, maxHeight: 120, overflowY: "auto", scrollbarWidth: "none" }}
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
                background: canSend ? "var(--db-grad-purple)" : "var(--border)",
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
            PDF·이미지·텍스트 파일을 첨부하거나 아이디어를 자유롭게 입력하세요
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes prog-spin { to { transform: rotate(360deg); } }
        .chat-textarea::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
