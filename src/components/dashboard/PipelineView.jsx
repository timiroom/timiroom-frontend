"use client";

import { useState, useEffect, useRef } from "react";

/* ── Pipeline steps data ── */
const STEPS = [
  {
    id:"prd",    label:"PRD 분석",    icon:"📋", agent:"PM Agent",
    status:"done", duration:"12s",
    outputs:["요구사항 23개 추출", "유저 플로우 3개", "비기능 요구사항 7개"],
    color:"var(--db-purple-400)",
  },
  {
    id:"embed",  label:"임베딩 생성", icon:"🧮", agent:"Embedding",
    status:"done", duration:"8s",
    outputs:["벡터 23개 생성", "pgvector 저장 완료"],
    color:"#818CF8",
  },
  {
    id:"api",    label:"API 명세 생성", icon:"🔌", agent:"DBA + API Agent",
    status:"running", duration:"진행 중",
    outputs:["엔드포인트 14개 생성", "요청/응답 스키마 초안"],
    color:"var(--db-blue)",
  },
  {
    id:"db",     label:"DB 스키마 생성", icon:"🗄️", agent:"DBA Agent",
    status:"waiting", duration:"—",
    outputs:[],
    color:"var(--db-green)",
  },
  {
    id:"valid",  label:"정합성 검증", icon:"🔍", agent:"검증 엔진",
    status:"waiting", duration:"—",
    outputs:[],
    color:"var(--db-orange)",
  },
  {
    id:"qa",     label:"QA 시나리오 생성", icon:"🧪", agent:"QA Agent",
    status:"waiting", duration:"—",
    outputs:[],
    color:"#F472B6",
  },
  {
    id:"spec",   label:"명세서 출력", icon:"📄", agent:"Swagger · Mermaid",
    status:"waiting", duration:"—",
    outputs:[],
    color:"var(--db-purple-300)",
  },
];

const STATUS_META = {
  done:    { label:"완료",   color:"var(--db-green)",  bg:"var(--db-green-bg)",  icon:"✅" },
  running: { label:"실행 중",color:"var(--db-blue)",   bg:"var(--db-blue-bg)",   icon:"⚡" },
  waiting: { label:"대기",   color:"var(--db-text-muted)", bg:"var(--db-bg-elevated)", icon:"⏳" },
  error:   { label:"오류",   color:"var(--db-red)",    bg:"var(--db-red-bg)",    icon:"❌" },
};

/* ── Log lines ── */
const LOG_LINES = [
  { t:"00:00:00", lvl:"INFO",  msg:"파이프라인 시작 — PRD 분석 중..." },
  { t:"00:00:03", lvl:"INFO",  msg:"PM Agent: 자연어 요구사항 파싱 완료" },
  { t:"00:00:08", lvl:"DEBUG", msg:"Embedding: text-embedding-3-large 호출" },
  { t:"00:00:12", lvl:"INFO",  msg:"요구사항 23개 벡터화 완료 → pgvector 저장" },
  { t:"00:00:15", lvl:"INFO",  msg:"DBA Agent: API 명세 초안 생성 시작" },
  { t:"00:00:18", lvl:"WARN",  msg:"API /api/orders — 응답 스키마 불일치 감지" },
  { t:"00:00:21", lvl:"INFO",  msg:"Self-correction 루프 진입 (1/3)" },
  { t:"00:00:25", lvl:"INFO",  msg:"API Agent: 엔드포인트 14개 생성 중..." },
];

const LVL_COLORS = {
  INFO:  "var(--db-green)",
  WARN:  "var(--db-orange)",
  ERROR: "var(--db-red)",
  DEBUG: "var(--db-text-muted)",
};

/* ── Animated progress bar ── */
function RunningBar({ color }) {
  const [w, setW] = useState(15);
  useEffect(() => {
    const id = setInterval(() => setW(v => v >= 90 ? 15 : v + 0.4), 60);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ height:3, background:"var(--db-bg-elevated)", borderRadius:100, overflow:"hidden", marginTop:6 }}>
      <div style={{ height:"100%", width:`${w}%`, background:color, borderRadius:100, transition:"width .05s", boxShadow:`0 0 8px ${color}` }}/>
    </div>
  );
}

/* ── Step card ── */
function StepCard({ step, index, isSelected, onClick }) {
  const meta = STATUS_META[step.status];
  const isRunning = step.status === "running";

  return (
    <div
      onClick={onClick}
      style={{
        display:"flex", gap:14, padding:"14px 16px",
        borderRadius:"var(--db-radius)",
        border:`1px solid ${isSelected ? "var(--db-border-active)" : isRunning ? "rgba(59,130,246,.25)" : "var(--db-border)"}`,
        background: isSelected ? "rgba(139,92,246,.1)" : isRunning ? "rgba(59,130,246,.06)" : "var(--db-bg-surface)",
        cursor:"pointer", transition:"var(--db-transition)",
        boxShadow: isRunning ? "0 0 16px rgba(59,130,246,.15)" : "none",
      }}
    >
      {/* Step index & connector */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
        <div style={{
          width:32, height:32, borderRadius:"50%", flexShrink:0,
          background: step.status==="done" ? "var(--db-green-bg)" : step.status==="running" ? "var(--db-blue-bg)" : "var(--db-bg-elevated)",
          border:`2px solid ${step.status==="done" ? "var(--db-green)" : step.status==="running" ? "var(--db-blue)" : "var(--db-border)"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:14, color:step.status==="done" ? "var(--db-green)" : step.status==="running" ? "var(--db-blue)" : "var(--db-text-muted)",
          fontWeight:700,
          boxShadow: isRunning ? "0 0 10px rgba(59,130,246,.4)" : "none",
        }}>
          {step.status === "done" ? "✓" : step.status === "running" ? <span style={{ animation:"db-spin 1s linear infinite", display:"block" }}>↻</span> : index+1}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <span style={{ fontSize:16 }}>{step.icon}</span>
          <span style={{ fontSize:14, fontWeight:700, color:"var(--db-text-primary)" }}>{step.label}</span>
          <span style={{ marginLeft:"auto", fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:100, background:meta.bg, color:meta.color }}>
            {meta.label}
          </span>
        </div>
        <div style={{ fontSize:11, color:"var(--db-text-muted)", marginBottom:4 }}>
          {step.agent} · {step.duration}
        </div>
        {isRunning && <RunningBar color={step.color}/>}
        {step.outputs.length > 0 && (
          <div style={{ marginTop:8, display:"flex", flexWrap:"wrap", gap:4 }}>
            {step.outputs.map((o,i) => (
              <span key={i} style={{
                fontSize:10, padding:"2px 8px", borderRadius:100,
                background:"rgba(139,92,246,.12)", color:"var(--db-purple-200)",
                border:"1px solid var(--db-border)",
              }}>{o}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── PipelineView (exported) ── */
export function PipelineView() {
  const [selected, setSelected] = useState("api");
  const [showLog,  setShowLog]  = useState(true);
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, []);

  const done    = STEPS.filter(s => s.status==="done").length;
  const running = STEPS.filter(s => s.status==="running").length;
  const total   = STEPS.length;
  const pct     = Math.round((done / total) * 100);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16, height:"calc(100vh - 140px)" }}>
      {/* Header stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
        {[
          { label:"전체 진행률",  value:`${pct}%`,   icon:"📊", color:"var(--db-purple-300)" },
          { label:"완료 스텝",    value:`${done}/${total}`, icon:"✅", color:"var(--db-green)"   },
          { label:"실행 중",      value:running,     icon:"⚡", color:"var(--db-blue)"    },
          { label:"소요 시간",    value:"25s",       icon:"⏱", color:"var(--db-orange)"  },
        ].map(s => (
          <div key={s.label} className="db-card" style={{ padding:"14px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:22 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:"var(--db-text-muted)" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="db-card" style={{ padding:"14px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"var(--db-text-secondary)", marginBottom:8 }}>
          <span>파이프라인 진행</span>
          <span style={{ color:"var(--db-purple-300)", fontWeight:700 }}>{pct}%</span>
        </div>
        <div style={{ height:6, background:"var(--db-bg-elevated)", borderRadius:100, overflow:"hidden" }}>
          <div style={{
            height:"100%", width:`${pct}%`,
            background:"linear-gradient(90deg, var(--db-purple-600), var(--db-purple-400))",
            borderRadius:100, boxShadow:"var(--db-glow-sm)", transition:"width .5s ease",
          }}/>
        </div>
        <div style={{ display:"flex", gap:4, marginTop:8 }}>
          {STEPS.map((s,i) => (
            <div key={s.id} style={{
              flex:1, height:3, borderRadius:100,
              background: s.status==="done" ? "var(--db-green)" : s.status==="running" ? "var(--db-blue)" : "var(--db-bg-elevated)",
              boxShadow: s.status==="running" ? "0 0 6px var(--db-blue)" : "none",
              transition:"background .3s",
            }}/>
          ))}
        </div>
      </div>

      {/* Steps + Log */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns: showLog ? "1fr 1fr" : "1fr", gap:16, minHeight:0 }}>
        {/* Steps list */}
        <div style={{ overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
          {STEPS.map((step, i) => (
            <StepCard
              key={step.id} step={step} index={i}
              isSelected={selected===step.id}
              onClick={() => setSelected(step.id)}
            />
          ))}
        </div>

        {/* Log panel */}
        {showLog && (
          <div className="db-card" style={{ display:"flex", flexDirection:"column", minHeight:0 }}>
            <div style={{ padding:"14px 16px", borderBottom:"1px solid var(--db-border)", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>🖥 실행 로그</div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"var(--db-green)" }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--db-green)", animation:"db-pulse 1.5s infinite" }}/>
                  SSE 스트리밍 중
                </div>
                <button onClick={() => setShowLog(false)} style={{ background:"none", border:"none", color:"var(--db-text-muted)", cursor:"pointer", fontSize:14 }}>✕</button>
              </div>
            </div>
            <div ref={logRef} style={{ flex:1, overflowY:"auto", padding:"12px 16px", fontFamily:"'JetBrains Mono', 'Fira Code', monospace" }}>
              {LOG_LINES.map((line, i) => (
                <div key={i} style={{ display:"flex", gap:10, fontSize:11, lineHeight:1.8, borderBottom:"1px solid rgba(139,92,246,.05)", paddingBottom:2 }}>
                  <span style={{ color:"var(--db-text-muted)", flexShrink:0 }}>{line.t}</span>
                  <span style={{ color:LVL_COLORS[line.lvl], fontWeight:700, flexShrink:0, width:42 }}>{line.lvl}</span>
                  <span style={{ color:"var(--db-text-secondary)" }}>{line.msg}</span>
                </div>
              ))}
              {/* Blinking cursor */}
              <div style={{ display:"flex", gap:10, fontSize:11, lineHeight:1.8, marginTop:4 }}>
                <span style={{ color:"var(--db-text-muted)" }}>00:00:28</span>
                <span style={{ color:"var(--db-blue)", fontWeight:700, width:42 }}>INFO</span>
                <span style={{ color:"var(--db-text-secondary)" }}>
                  처리 중
                  <span style={{ animation:"db-pulse 1s infinite", marginLeft:4 }}>▌</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
