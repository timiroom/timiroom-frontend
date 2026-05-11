"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ── Graph data ── */
const NODES = [
  { id:"prd",     x:400, y:260, label:"PRD",          type:"prd",    size:34, icon:"📋" },
  { id:"uc",      x:220, y:140, label:"유저플로우",    type:"design", size:26, icon:"👤" },
  { id:"api",     x:560, y:130, label:"API 명세",      type:"api",    size:28, icon:"🔌" },
  { id:"db",      x:580, y:360, label:"DB 스키마",     type:"db",     size:28, icon:"🗄️" },
  { id:"qa",      x:220, y:370, label:"QA 시나리오",   type:"qa",     size:26, icon:"🧪" },
  { id:"swagger", x:700, y:220, label:"Swagger",       type:"spec",   size:22, icon:"📝" },
  { id:"mermaid", x:700, y:310, label:"Mermaid",       type:"spec",   size:22, icon:"🔱" },
  { id:"neo4j",   x:400, y:430, label:"Neo4j",         type:"data",   size:24, icon:"🕸" },
  { id:"pm",      x:140, y:250, label:"PM Agent",      type:"agent",  size:24, icon:"🧠" },
  { id:"dba",     x:400, y:100, label:"DBA Agent",     type:"agent",  size:24, icon:"💾" },
  { id:"kafka",   x:540, y:460, label:"Kafka",         type:"infra",  size:20, icon:"⚡" },
];

const EDGES = [
  { from:"prd",  to:"uc",      label:"생성"   },
  { from:"prd",  to:"api",     label:"생성"   },
  { from:"prd",  to:"db",      label:"생성"   },
  { from:"prd",  to:"qa",      label:"생성"   },
  { from:"api",  to:"swagger", label:"출력"   },
  { from:"db",   to:"mermaid", label:"출력"   },
  { from:"db",   to:"neo4j",   label:"저장"   },
  { from:"prd",  to:"neo4j",   label:"저장"   },
  { from:"pm",   to:"prd",     label:"분석"   },
  { from:"dba",  to:"db",      label:"검증"   },
  { from:"neo4j",to:"kafka",   label:"이벤트" },
  { from:"api",  to:"qa",      label:"참조"   },
];

const NODE_COLORS = {
  prd:    { fill:"var(--text-1)", glow:"rgba(26,25,22,.7)",  ring:"#6b6960" },
  design: { fill:"#4338CA", glow:"rgba(67,56,202,.6)",   ring:"#818CF8" },
  api:    { fill:"#0369A1", glow:"rgba(3,105,161,.6)",   ring:"#38BDF8" },
  db:     { fill:"#065F46", glow:"rgba(6,95,70,.6)",     ring:"#34D399" },
  qa:     { fill:"#92400E", glow:"rgba(146,64,14,.6)",   ring:"#FCD34D" },
  spec:   { fill:"#1E3A5F", glow:"rgba(30,58,95,.5)",    ring:"#60A5FA" },
  data:   { fill:"#3B1A6B", glow:"rgba(59,26,107,.6)",   ring:"#C084FC" },
  agent:  { fill:"#1A3A2A", glow:"rgba(16,185,129,.5)",  ring:"#6EE7B7" },
  infra:  { fill:"#3D1F00", glow:"rgba(245,158,11,.5)",  ring:"#FCD34D" },
};

/* ── Filter panel ── */
const FILTER_TYPES = [
  { id:"all",    label:"전체" },
  { id:"prd",    label:"PRD" },
  { id:"api",    label:"API" },
  { id:"db",     label:"DB" },
  { id:"agent",  label:"에이전트" },
  { id:"spec",   label:"명세서" },
];

/* ── KnowledgeGraph (exported) ── */
export function KnowledgeGraph() {
  const [selected, setSelected] = useState(null);
  const [hovered,  setHovered]  = useState(null);
  const [filter,   setFilter]   = useState("all");
  const [tick,     setTick]     = useState(0);
  const svgRef = useRef(null);

  // Animated edge flow tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);

  const visibleNodes = filter === "all"
    ? NODES
    : NODES.filter(n => n.type === filter || n.id === "prd");

  const visibleEdges = EDGES.filter(e =>
    visibleNodes.find(n => n.id === e.from) && visibleNodes.find(n => n.id === e.to)
  );

  const getNode = (id) => NODES.find(n => n.id === id);

  const selectedNode = selected ? NODES.find(n => n.id === selected) : null;

  return (
    <div style={{ display:"flex", gap:20, height:"calc(100vh - 140px)" }}>
      {/* Graph canvas */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12 }}>
        {/* Toolbar */}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {FILTER_TYPES.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding:"6px 14px", borderRadius:100, fontSize:12, fontWeight:600,
                border:`1px solid ${filter===f.id ? "var(--db-purple-400)" : "var(--border)"}`,
                background: filter===f.id ? "rgba(26,25,22,.2)" : "var(--surface)",
                color: filter===f.id ? "var(--db-purple-300)" : "var(--text-3)",
                cursor:"pointer", transition:"var(--db-transition)",
              }}
            >{f.label}</button>
          ))}
          <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
            <button style={{ padding:"6px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-3)", fontSize:12, cursor:"pointer" }}>레이아웃 ⟳</button>
            <button style={{ padding:"6px 12px", borderRadius:8, border:"1px solid var(--border)", background:"var(--surface)", color:"var(--text-3)", fontSize:12, cursor:"pointer" }}>내보내기 ↗</button>
          </div>
        </div>

        {/* SVG Graph */}
        <div className="db-card" style={{ flex:1, overflow:"hidden", position:"relative", padding:0 }}>
          {/* Grid background */}
          <svg width="100%" height="100%" style={{ position:"absolute", inset:0 }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(26,25,22,.05)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>

          {/* Main graph SVG */}
          <svg ref={svgRef} width="100%" height="100%" viewBox="0 0 840 540" style={{ position:"relative", zIndex:1 }}>
            <defs>
              {/* Glow filters */}
              {Object.entries(NODE_COLORS).map(([type, c]) => (
                <filter key={type} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              ))}
              {/* Arrow marker */}
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="rgba(26,25,22,.4)"/>
              </marker>
              <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#6b6960"/>
              </marker>
            </defs>

            {/* Edges */}
            {visibleEdges.map((edge, i) => {
              const from = getNode(edge.from);
              const to   = getNode(edge.to);
              if (!from || !to) return null;
              const isActive = hovered === edge.from || hovered === edge.to || selected === edge.from || selected === edge.to;
              const dx = to.x - from.x, dy = to.y - from.y;
              const len = Math.sqrt(dx*dx + dy*dy);
              const cx = (from.x + to.x)/2 + (-dy/len)*30;
              const cy = (from.y + to.y)/2 + (dx/len)*30;
              const d = `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`;
              const dashLen = 200;
              const offset = -(tick * 1.5) % dashLen;

              return (
                <g key={`${edge.from}-${edge.to}`}>
                  {/* Base edge */}
                  <path d={d} fill="none"
                    stroke={isActive ? "rgba(107,105,96,.5)" : "rgba(26,25,22,.15)"}
                    strokeWidth={isActive ? 2 : 1.5}
                    markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow)"}
                  />
                  {/* Animated flow dash */}
                  {isActive && (
                    <path d={d} fill="none"
                      stroke="rgba(196,181,253,.8)" strokeWidth="2"
                      strokeDasharray="8 12"
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                    />
                  )}
                  {/* Edge label */}
                  {isActive && (
                    <text x={cx} y={cy-6} textAnchor="middle" fontSize="9"
                      fill="var(--db-purple-200)" style={{ pointerEvents:"none" }}>
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {visibleNodes.map((node) => {
              const c = NODE_COLORS[node.type] || NODE_COLORS.data;
              const isSelected = selected === node.id;
              const isHovered  = hovered  === node.id;
              const scale = isSelected ? 1.2 : isHovered ? 1.1 : 1;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
                  style={{ cursor:"pointer", transition:"transform .2s ease", transformOrigin:`${node.x}px ${node.y}px` }}
                  onClick={() => setSelected(selected === node.id ? null : node.id)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Outer glow ring */}
                  {(isSelected || isHovered) && (
                    <circle r={node.size + 10} fill="none"
                      stroke={c.ring} strokeWidth="1"
                      strokeDasharray="4 4" opacity="0.6"
                      style={{ animation:"db-spin 8s linear infinite" }}
                    />
                  )}
                  {/* Glow halo */}
                  <circle r={node.size + 6} fill={c.glow} opacity={isSelected ? 0.5 : 0.2} filter={`url(#glow-${node.type})`}/>
                  {/* Main circle */}
                  <circle r={node.size} fill={c.fill}
                    stroke={isSelected ? c.ring : "rgba(0,0,0,.15)"}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  {/* Icon */}
                  <text y="6" textAnchor="middle" fontSize={node.size * 0.65} style={{ userSelect:"none" }}>
                    {node.icon}
                  </text>
                  {/* Label */}
                  <text y={node.size + 14} textAnchor="middle"
                    fontSize="10" fontWeight="600"
                    fill={isSelected ? c.ring : "var(--text-2)"}
                    style={{ userSelect:"none" }}>
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend */}
          <div style={{
            position:"absolute", bottom:16, left:16,
            display:"flex", gap:10, flexWrap:"wrap",
          }}>
            {Object.entries(NODE_COLORS).slice(0,6).map(([type, c]) => (
              <div key={type} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:"var(--text-3)" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:c.ring }}/>
                {type}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — node detail */}
      <div style={{ width:240, display:"flex", flexDirection:"column", gap:12 }}>
        {/* Node info */}
        {selectedNode ? (
          <div className="db-card" style={{ padding:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <div style={{
                width:40, height:40, borderRadius:10,
                background:NODE_COLORS[selectedNode.type]?.fill || "var(--border-2)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, boxShadow:`0 0 14px ${NODE_COLORS[selectedNode.type]?.glow}`,
              }}>{selectedNode.icon}</div>
              <div>
                <div style={{ fontWeight:700 }}>{selectedNode.label}</div>
                <div style={{ fontSize:11, color:"var(--text-3)" }}>{selectedNode.type} 노드</div>
              </div>
            </div>
            <div style={{ fontSize:12, color:"var(--text-2)", lineHeight:1.7 }}>
              연결된 엣지: {EDGES.filter(e => e.from===selectedNode.id||e.to===selectedNode.id).length}개
            </div>
            <div style={{ marginTop:12 }}>
              {EDGES.filter(e => e.from===selectedNode.id||e.to===selectedNode.id).map((e,i) => {
                const other = getNode(e.from===selectedNode.id ? e.to : e.from);
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid var(--border)", fontSize:12 }}>
                    <span style={{ fontSize:14 }}>{other?.icon}</span>
                    <span style={{ color:"var(--text-2)" }}>{other?.label}</span>
                    <span style={{ marginLeft:"auto", color:"var(--db-purple-200)", fontSize:10 }}>{e.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="db-card" style={{ padding:20, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>🕸️</div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>노드를 선택하세요</div>
            <div style={{ fontSize:12, color:"var(--text-3)", lineHeight:1.7 }}>그래프에서 노드를 클릭하면 연결 관계와 상세 정보를 확인할 수 있습니다.</div>
          </div>
        )}

        {/* Graph stats */}
        <div className="db-card" style={{ padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>그래프 현황</div>
          {[
            { label:"노드",  value: visibleNodes.length, total: NODES.length,  color:"var(--db-purple-300)" },
            { label:"엣지",  value: visibleEdges.length, total: EDGES.length,  color:"var(--text-1)" },
            { label:"클러스터", value:3,                total:3,               color:"var(--text-2)" },
          ].map(s => (
            <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
              <span style={{ fontSize:12, color:"var(--text-2)" }}>{s.label}</span>
              <span style={{ fontSize:14, fontWeight:700, color:s.color }}>{s.value}<span style={{ fontSize:11, color:"var(--text-3)" }}>/{s.total}</span></span>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="db-card" style={{ padding:16 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>빠른 작업</div>
          {[
            { icon:"🔄", label:"그래프 재분석"     },
            { icon:"📤", label:"PNG 내보내기"      },
            { icon:"🔍", label:"영향도 시뮬레이션" },
          ].map(a => (
            <button key={a.label} style={{
              display:"flex", alignItems:"center", gap:8, width:"100%",
              padding:"8px 10px", borderRadius:"var(--db-radius-sm)",
              border:"1px solid var(--border)", background:"var(--border)",
              color:"var(--text-2)", fontSize:12, cursor:"pointer", marginBottom:6,
              transition:"var(--db-transition)",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor="var(--db-border-mid)"; e.currentTarget.style.color="var(--text-1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.color="var(--text-2)"; }}
            ><span>{a.icon}</span>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
