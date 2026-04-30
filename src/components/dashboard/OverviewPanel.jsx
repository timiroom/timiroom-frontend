"use client";

import { useState, useEffect } from "react";
import { useCounter } from "@/hooks";

/* ── Stat Card ── */
function StatCard({ icon, label, value, unit="", sub, color="#6b6960", delay=0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);

  return (
    <div className="db-card" style={{
      padding: "22px 24px", cursor:"default",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(14px)",
      transition: `opacity .5s ease ${delay}ms, transform .5s ease ${delay}ms, border-color .2s, box-shadow .2s`,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div style={{
          width:42, height:42, borderRadius:10,
          background:`rgba(${color === "#6b6960" ? "167,139,250" : color === "#10B981" ? "16,185,129" : color === "#3B82F6" ? "59,130,246" : "245,158,11"},.15)`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
          boxShadow:`0 0 14px rgba(${color === "#6b6960" ? "167,139,250" : "139,92,246"},.2)`,
        }}>{icon}</div>
        <span style={{ fontSize:11, color:"var(--text-3)", background:"var(--border)", padding:"3px 8px", borderRadius:100 }}>24h</span>
      </div>
      <div style={{ fontSize:30, fontWeight:900, letterSpacing:"-0.03em", color, lineHeight:1 }}>
        {value}<span style={{ fontSize:18, fontWeight:700 }}>{unit}</span>
      </div>
      <div style={{ fontSize:13, color:"var(--text-2)", marginTop:4 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:"var(--text-3)", marginTop:8, paddingTop:8, borderTop:"1px solid var(--border)" }}>{sub}</div>}
    </div>
  );
}

/* ── Score Ring ── */
function ScoreRing({ score=72 }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="db-card" style={{ padding:"24px", display:"flex", alignItems:"center", gap:24 }}>
      <div style={{ position:"relative", width:110, height:110, flexShrink:0 }}>
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={r} fill="none" stroke="var(--border)" strokeWidth="8"/>
          <circle
            cx="55" cy="55" r={r} fill="none"
            stroke="url(#ringGrad)" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            strokeDashoffset={circ * 0.25}
            style={{ transition:"stroke-dasharray 1s ease", filter:"url(#glow)" }}
          />
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b6960"/>
              <stop offset="100%" stopColor="#7C3AED"/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
        </svg>
        <div style={{
          position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center",
        }}>
          <div style={{ fontSize:22, fontWeight:900, color:"var(--db-purple-300)" }}>{score}</div>
          <div style={{ fontSize:10, color:"var(--text-3)" }}>/ 100</div>
        </div>
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>정합성 스코어</div>
        <div style={{ fontSize:12, color:"var(--text-3)", marginBottom:16 }}>현재 이커머스 리뉴얼 프로젝트</div>
        {[
          { label:"API 명세", pct:88, color:"#6b6960" },
          { label:"DB 스키마", pct:72, color:"#3B82F6" },
          { label:"QA 커버리지", pct:65, color:"#10B981" },
        ].map((item) => (
          <div key={item.label} style={{ marginBottom:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--text-2)", marginBottom:4 }}>
              <span>{item.label}</span><span style={{ color:item.color }}>{item.pct}%</span>
            </div>
            <div style={{ height:4, background:"var(--border)", borderRadius:100, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${item.pct}%`, background:item.color, borderRadius:100, boxShadow:`0 0 6px ${item.color}` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Activity Feed ── */
const ACTIVITIES = [
  { time:"2분 전",  icon:"✅", text:"API 명세 자동 생성 완료", type:"green",  sub:"GET /api/products · 14개 엔드포인트"  },
  { time:"8분 전",  icon:"⚠️", text:"DB 스키마 정합성 경고",   type:"orange", sub:"orders.user_id FK 누락 탐지"          },
  { time:"15분 전", icon:"🤖", text:"PM 에이전트 PRD 분석 완료", type:"purple",sub:"요구사항 23개 항목 추출"               },
  { time:"31분 전", icon:"🔄", text:"버전 v1.3.0 스냅샷 저장",  type:"blue",  sub:"변경사항 12건 커밋"                    },
  { time:"1시간 전",icon:"🕸", text:"지식 그래프 업데이트",     type:"purple", sub:"노드 +8 · 엣지 +15"                   },
];

function ActivityFeed() {
  return (
    <div className="db-card" style={{ padding:"20px 24px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700 }}>최근 활동</div>
        <span style={{ fontSize:12, color:"var(--db-purple-300)", cursor:"pointer" }}>전체 보기 →</span>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        {ACTIVITIES.map((a, i) => {
          const colors = { green:"var(--db-green)", orange:"var(--db-orange)", purple:"var(--db-purple-300)", blue:"var(--db-blue)" };
          const bgs    = { green:"var(--db-green-bg)", orange:"var(--db-orange-bg)", purple:"rgba(26,25,22,.12)", blue:"var(--db-blue-bg)" };
          return (
            <div key={i} style={{
              display:"flex", gap:12, padding:"10px 12px",
              borderRadius:"var(--db-radius-sm)",
              transition:"var(--db-transition)", cursor:"default",
            }}
            onMouseEnter={e => e.currentTarget.style.background="var(--border)"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}
            >
              <div style={{
                width:32, height:32, borderRadius:8, flexShrink:0,
                background:bgs[a.type], display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:15,
              }}>{a.icon}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"var(--text-1)" }}>{a.text}</div>
                <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.sub}</div>
              </div>
              <div style={{ fontSize:11, color:"var(--text-3)", flexShrink:0 }}>{a.time}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Agent Status ── */
const AGENTS = [
  { name:"PM Agent",  role:"기획 분석",    status:"idle",    icon:"🧠" },
  { name:"DBA Agent", role:"DB 설계",      status:"running", icon:"🗄️" },
  { name:"API Agent", role:"API 명세",     status:"done",    icon:"🔌" },
  { name:"QA Agent",  role:"테스트 케이스", status:"waiting", icon:"🧪" },
];

function AgentStatus() {
  const statusStyles = {
    running: { color:"var(--db-green)",  bg:"var(--db-green-bg)",  label:"실행 중", dot:true },
    idle:    { color:"var(--text-3)", bg:"var(--border)", label:"대기",   dot:false },
    done:    { color:"var(--db-blue)",   bg:"var(--db-blue-bg)",   label:"완료",   dot:false },
    waiting: { color:"var(--db-orange)", bg:"var(--db-orange-bg)", label:"보류",   dot:false },
  };

  return (
    <div className="db-card" style={{ padding:"20px 24px" }}>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:16 }}>에이전트 상태</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {AGENTS.map((ag) => {
          const s = statusStyles[ag.status];
          return (
            <div key={ag.name} style={{
              display:"flex", alignItems:"center", gap:12,
              padding:"10px 12px", borderRadius:"var(--db-radius-sm)",
              background:"var(--border)", border:"1px solid var(--border)",
            }}>
              <span style={{ fontSize:20 }}>{ag.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{ag.name}</div>
                <div style={{ fontSize:11, color:"var(--text-3)" }}>{ag.role}</div>
              </div>
              <div style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"3px 10px", borderRadius:100,
                background:s.bg, color:s.color, fontSize:11, fontWeight:700,
              }}>
                {s.dot && <div style={{ width:6, height:6, borderRadius:"50%", background:s.color, animation:"db-pulse 1.5s infinite" }} />}
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── OverviewPanel (exported) ── */
export function OverviewPanel() {
  const stats = [
    { icon:"📁", label:"활성 프로젝트", value:3,  unit:"개", sub:"↑ 1 이번 주 신규", color:"#6b6960", delay:0   },
    { icon:"⚡", label:"실행 중 파이프라인", value:2, unit:"개", sub:"평균 소요: 4분 23초", color:"#3B82F6", delay:80  },
    { icon:"📄", label:"생성된 명세서", value:47, unit:"건", sub:"Swagger 18 · Mermaid 29", color:"#10B981", delay:160 },
    { icon:"🔍", label:"탐지된 정합성 이슈", value:3, unit:"건", sub:"⚠️ 2 경고 · ❌ 1 오류", color:"#F59E0B", delay:240 },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:16 }}>
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Second row */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr", gap:16 }}>
        <ScoreRing score={72} />
        <AgentStatus />
      </div>

      {/* Third row */}
      <ActivityFeed />
    </div>
  );
}
