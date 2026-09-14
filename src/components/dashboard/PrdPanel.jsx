"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AiChatDock } from "./AiChatDock";
import { updateArtifact } from "@/lib/pipelineApi";

const C = {
  bg:        "var(--surface)",
  surface:   "#f7f6f3",
  border:    "rgba(0,0,0,0.07)",
  text:      "#1a1916",
  muted:     "var(--text-3)",
  sub:       "var(--text-3)",
  accent:    "#6b6960",
  accentBg:  "rgba(107,105,96,0.1)",
  accentBdr: "rgba(107,105,96,0.25)",
  card:      "#ffffff",
};

const PRD_SECTIONS = [
  { key: "overview",  label: "프로젝트 개요",   icon: "📋", fields: ["projectOverview","background"] },
  { key: "goals",     label: "목표 & KPI",      icon: "🎯", fields: ["goals","kpi"] },
  { key: "features",  label: "핵심 기능",        icon: "✨",     fields: ["coreFeatures"] },
  { key: "personas",  label: "사용자 페르소나",  icon: "👥", fields: ["userPersonas"] },
  { key: "mvp",       label: "MVP 범위",         icon: "📦", fields: ["mvpScope"] },
  { key: "techstack", label: "기술 스택",        icon: "🛠️", fields: ["techStack"] },
  { key: "schedule",  label: "릴리즈 일정",      icon: "📅", fields: ["releaseSchedule"] },
];

const PRIORITY_COLOR = {
  P0: { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626" },
  P1: { bg: "#fff7ed", border: "#fdba74", text: "#ea580c" },
  P2: { bg: "#f0f9ff", border: "#7dd3fc", text: "#0284c7" },
};

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [value];
}

const SOURCE_RE = /(\(출처[:：][^)]*\))/g;

/* 본문 중 "(출처: 기관명, YYYY년)" 표기를 작고 흐린 텍스트로 분리 렌더링 */
function SourceText({ text }) {
  if (text == null || text === "") return null;
  return String(text).split(SOURCE_RE).map((part, i) =>
    /^\(출처[:：]/.test(part)
      ? <span key={i} style={{ fontSize:"0.85em", color:C.muted, fontWeight:400 }}>{part}</span>
      : <span key={i}>{part}</span>
  );
}

function sectionHasData(doc, key) {
  if (!doc) return false;
  const sec = PRD_SECTIONS.find(s => s.key === key);
  if (!sec) return false;
  return sec.fields.some(f => {
    const v = doc[f];
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return String(v).trim().length > 0;
  });
}

function parseSectionsFromHtml(html) {
  if (typeof document === "undefined" || !html) return [];
  const div = document.createElement("div");
  div.innerHTML = html;
  const sections = [];
  let current = null;
  Array.from(div.childNodes).forEach(node => {
    const tag = node.tagName?.toUpperCase();
    if (tag === "H2") {
      if (current) sections.push(current);
      current = { key: node.textContent, label: node.textContent, icon: "📄", html: node.outerHTML };
    } else if (tag === "H1" && !current) {
      current = { key: "__overview__", label: "개요", icon: "📋", html: node.outerHTML };
    } else if (current) {
      current.html += node.outerHTML || "";
    } else {
      if (!current) current = { key: "__overview__", label: "개요", icon: "📋", html: "" };
      current.html += node.outerHTML || node.textContent || "";
    }
  });
  if (current) sections.push(current);
  return sections;
}

/* esc() + 줄바꿈(\n → <br>) + "(출처: ...)" 흐린 텍스트 처리 */
function escSource(s) {
  return esc(s)
    .replace(/(\(출처[:：][^)]*\))/g, `<span style="font-size:0.85em;color:#9ca3af;font-weight:400">$1</span>`)
    .replace(/\n/g, "<br>");
}

function prdJsonToHtml(doc) {
  if (!doc || typeof doc !== "object") return "";
  const out = [];
  if (doc.projectOverview) out.push(`<h1>${esc(doc.projectOverview)}</h1>`);
  if (doc.background)      out.push(`<h2>배경</h2><p>${escSource(doc.background)}</p>`);
  const goals = asList(doc.goals);
  const kpi = asList(doc.kpi);
  const coreFeatures = asList(doc.coreFeatures);
  const userPersonas = asList(doc.userPersonas);
  const releaseSchedule = asList(doc.releaseSchedule);
  if (goals.length) out.push(`<h2>목표</h2><ul>${goals.map(g=>`<li>${escSource(g)}</li>`).join("")}</ul>`);
  if (kpi.length) out.push(`<h2>KPI</h2><ul>${kpi.map(k=>`<li><strong>${esc(k.metric)}</strong>: ${esc(k.target)} (${esc(k.basis)})</li>`).join("")}</ul>`);
  if (coreFeatures.length) {
    out.push(`<h2>핵심 기능</h2>`);
    coreFeatures.forEach(f => {
      out.push(`<h3>${esc(f.name)}${f.priority?` <code>${esc(f.priority)}</code>`:""}</h3>`);
      if (f.description) out.push(`<p>${escSource(f.description)}</p>`);
      const requirements = asList(f.requirements);
      if (requirements.length) out.push(`<ul>${requirements.map(r=>`<li>${escSource(r)}</li>`).join("")}</ul>`);
    });
  }
  if (userPersonas.length) {
    out.push(`<h2>사용자 페르소나</h2>`);
    userPersonas.forEach(p => {
      out.push(`<h3>${esc(p.name)} (${esc(p.age)}, ${esc(p.job)})</h3>`);
      if (p.goal)      out.push(`<p><strong>목표:</strong> ${escSource(p.goal)}</p>`);
      if (p.painPoint) out.push(`<p><strong>불편함:</strong> ${escSource(p.painPoint)}</p>`);
    });
  }
  if (doc.mvpScope) {
    out.push(`<h2>MVP 범위</h2>`);
    const included = asList(doc.mvpScope.included);
    const excluded = asList(doc.mvpScope.excluded);
    if (included.length) out.push(`<p><strong>포함:</strong> ${esc(included.join(", "))}</p>`);
    if (excluded.length) out.push(`<p><strong>제외:</strong> ${esc(excluded.join(", "))}</p>`);
    if (doc.mvpScope.rationale) out.push(`<p>${escSource(doc.mvpScope.rationale)}</p>`);
  }
  if (doc.techStack && typeof doc.techStack === "object") {
    out.push(`<h2>기술 스택</h2><ul>`);
    Object.entries(doc.techStack).forEach(([k,v]) => out.push(`<li><strong>${esc(k)}:</strong> ${esc(v)}</li>`));
    out.push(`</ul>`);
  }
  if (releaseSchedule.length) {
    out.push(`<h2>릴리즈 일정</h2>`);
    releaseSchedule.forEach(r => {
      out.push(`<h3>${esc(r.milestone)} (${esc(r.date)})</h3>`);
      if (r.description)          out.push(`<p>${escSource(r.description)}</p>`);
      const deliverables = asList(r.deliverables);
      if (deliverables.length) out.push(`<ul>${deliverables.map(d=>`<li>${esc(d)}</li>`).join("")}</ul>`);
    });
  }
  return out.join("\n") || "<p><br></p>";
}

/* ══════════════════════════════════════
   섹션 뷰 컴포넌트들
══════════════════════════════════════ */

function SectionTitle({ icon, title }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
        <span style={{ fontSize:22 }}>{icon}</span>
        <h1 style={{ margin:0, fontSize:24, fontWeight:800, color:C.text }}>{title}</h1>
      </div>
      <div style={{ height:2, background:"rgba(0,0,0,0.06)", borderRadius:1 }} />
    </div>
  );
}

function EmptySectionState({ label }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
      <div style={{ fontSize:32, marginBottom:12 }}>{"📄"}</div>
      <div style={{ fontSize:14, fontWeight:600 }}>{label} {"정보가 없습니다"}</div>
      <div style={{ fontSize:12, marginTop:4 }}>{"파이프라인을 실행하거나 편집 모드에서 추가하세요"}</div>
    </div>
  );
}

function OverviewView({ doc }) {
  return (
    <div>
      <SectionTitle icon={"📋"} title={"프로젝트 개요"} />
      {doc.projectOverview ? (
        <div style={{ padding:"20px 24px", borderRadius:12, background:C.card, border:`1px solid ${C.border}`, marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <h2 style={{ margin:"0 0 12px", fontSize:20, fontWeight:700, color:C.text, whiteSpace:"pre-wrap" }}>{doc.projectOverview}</h2>
          {doc.background && <p style={{ margin:0, fontSize:14, color:"#374151", lineHeight:1.8, whiteSpace:"pre-wrap" }}><SourceText text={doc.background} /></p>}
        </div>
      ) : <EmptySectionState label={"프로젝트 개요"} />}
    </div>
  );
}

function GoalsView({ doc }) {
  const goals = asList(doc.goals);
  const kpi = asList(doc.kpi);
  return (
    <div>
      <SectionTitle icon={"🎯"} title={"목표 & KPI"} />
      {goals.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>{"목표"}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {goals.map((g,i) => (
              <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 16px", borderRadius:10, background:C.card, border:`1px solid ${C.border}`, boxShadow:"0 1px 3px rgba(0,0,0,0.03)" }}>
                <span style={{ fontSize:11, fontWeight:800, color:"#6b6960", background:"rgba(107,105,96,0.1)", border:"1px solid rgba(107,105,96,0.2)", padding:"2px 7px", borderRadius:5, flexShrink:0, marginTop:1 }}>{i+1}</span>
                <span style={{ fontSize:14, color:C.text, lineHeight:1.7 }}><SourceText text={g} /></span>
              </div>
            ))}
          </div>
        </div>
      )}
      {kpi.length > 0 && (
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>KPI</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {kpi.map((k,i) => (
              <div key={i} style={{ padding:"14px 18px", borderRadius:10, background:C.card, border:`1px solid ${C.border}`, boxShadow:"0 1px 3px rgba(0,0,0,0.03)" }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:4 }}>{k.metric}</div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  <span style={{ fontSize:13, color:"#059669", fontWeight:600 }}>{"목표"}: {k.target}</span>
                  {k.basis && <span style={{ fontSize:12, color:C.muted }}>{k.basis}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!goals.length && !kpi.length && <EmptySectionState label={"목표 & KPI"} />}
    </div>
  );
}

function FeaturesView({ doc }) {
  const features = useMemo(() => asList(doc.coreFeatures), [doc.coreFeatures]);
  const grouped = useMemo(() => {
    const g = { P0:[], P1:[], P2:[], etc:[] };
    features.forEach(f => {
      const p = f.priority?.toUpperCase();
      if (p==="P0") g.P0.push(f); else if (p==="P1") g.P1.push(f); else if (p==="P2") g.P2.push(f); else g.etc.push(f);
    });
    return g;
  }, [features]);
  const groups = [
    { key:"P0", label:"P0 — 핵심 필수", items:grouped.P0 },
    { key:"P1", label:"P1 — 중요",       items:grouped.P1 },
    { key:"P2", label:"P2 — 선택",       items:grouped.P2 },
    { key:"etc",label:"기타",                 items:grouped.etc },
  ].filter(g=>g.items.length>0);

  if (!features.length) return (
    <div><SectionTitle icon={"✨"} title={"핵심 기능"} /><EmptySectionState label={"핵심 기능"} /></div>
  );
  return (
    <div>
      <SectionTitle icon={"✨"} title={"핵심 기능"} />
      {groups.map(group => {
        const pc = PRIORITY_COLOR[group.key] || { bg:"#f9fafb", border:"#e5e7eb", text:"#6b7280" };
        return (
          <div key={group.key} style={{ marginBottom:24 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:800, padding:"2px 8px", borderRadius:5, background:pc.bg, border:`1px solid ${pc.border}`, color:pc.text }}>{group.key!=="etc"?group.key:"—"}</span>
              <span style={{ fontSize:13, fontWeight:600, color:C.muted }}>{group.label}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {group.items.map((f,i) => (
                <div key={i} style={{ padding:"16px 18px", borderRadius:12, background:C.card, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:f.description||asList(f.requirements).length?8:0 }}>{f.name}</div>
                  {f.description && <p style={{ margin:"0 0 10px", fontSize:13, color:"#374151", lineHeight:1.7 }}><SourceText text={f.description} /></p>}
                  {asList(f.requirements).length>0 && (
                    <ul style={{ margin:0, paddingLeft:18 }}>
                      {asList(f.requirements).map((r,j)=><li key={j} style={{ fontSize:13, color:C.muted, lineHeight:1.7, marginBottom:2 }}><SourceText text={r} /></li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PersonasView({ doc }) {
  const personas = asList(doc.userPersonas);
  if (!personas.length) return (
    <div><SectionTitle icon={"👥"} title={"사용자 페르소나"} /><EmptySectionState label={"사용자 페르소나"} /></div>
  );
  return (
    <div>
      <SectionTitle icon={"👥"} title={"사용자 페르소나"} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {personas.map((p,i) => (
          <div key={i} style={{ padding:"18px 20px", borderRadius:14, background:C.card, border:`1px solid ${C.border}`, boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"rgba(107,105,96,0.1)", border:"1px solid rgba(107,105,96,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{"👤"}</div>
              <div>
                <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{p.name}</div>
                <div style={{ fontSize:12, color:C.muted }}>{[p.age,p.job].filter(Boolean).join(" · ")}</div>
              </div>
            </div>
            {p.goal && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#059669", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{"목표"}</div>
                <div style={{ fontSize:13, color:C.text, lineHeight:1.6 }}><SourceText text={p.goal} /></div>
              </div>
            )}
            {p.painPoint && (
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{"불편함"}</div>
                <div style={{ fontSize:13, color:C.text, lineHeight:1.6 }}><SourceText text={p.painPoint} /></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MvpView({ doc }) {
  const mvp = doc.mvpScope;
  if (!mvp) return (
    <div><SectionTitle icon={"📦"} title={"MVP 범위"} /><EmptySectionState label={"MVP 범위"} /></div>
  );
  const included = asList(mvp.included);
  const excluded = asList(mvp.excluded);
  return (
    <div>
      <SectionTitle icon={"📦"} title={"MVP 범위"} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        {included.length>0 && (
          <div style={{ padding:"16px 18px", borderRadius:12, background:"#f0fdf4", border:"1px solid #bbf7d0" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>{"✅ 포함"}</div>
            <ul style={{ margin:0, paddingLeft:16 }}>
              {included.map((item,i)=><li key={i} style={{ fontSize:13, color:"#166534", lineHeight:1.7, marginBottom:3 }}>{item}</li>)}
            </ul>
          </div>
        )}
        {excluded.length>0 && (
          <div style={{ padding:"16px 18px", borderRadius:12, background:"#fef2f2", border:"1px solid #fecaca" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>{"❌ 제외"}</div>
            <ul style={{ margin:0, paddingLeft:16 }}>
              {excluded.map((item,i)=><li key={i} style={{ fontSize:13, color:"#991b1b", lineHeight:1.7, marginBottom:3 }}>{item}</li>)}
            </ul>
          </div>
        )}
      </div>
      {mvp.rationale && (
        <div style={{ padding:"14px 18px", borderRadius:10, background:C.card, border:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>{"결정 근거"}</div>
          <p style={{ margin:0, fontSize:13, color:C.text, lineHeight:1.8 }}><SourceText text={mvp.rationale} /></p>
        </div>
      )}
    </div>
  );
}

const TECH_COLOR = { frontend:"#3b82f6",backend:"#10b981",database:"#f59e0b",infra:"#8b5cf6",devops:"#06b6d4",mobile:"#ec4899",cloud:"#f97316","api":"#6366f1" };

function TechStackView({ doc }) {
  const stack = doc.techStack;
  if (!stack||typeof stack!=="object"||!Object.keys(stack).length) return (
    <div><SectionTitle icon={"🛠️"} title={"기술 스택"} /><EmptySectionState label={"기술 스택"} /></div>
  );
  return (
    <div>
      <SectionTitle icon={"🛠️"} title={"기술 스택"} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
        {Object.entries(stack).map(([key,value]) => {
          const ck = Object.keys(TECH_COLOR).find(k=>key.toLowerCase().includes(k));
          const color = TECH_COLOR[ck]||"#6b7280";
          return (
            <div key={key} style={{ padding:"14px 16px", borderRadius:12, background:C.card, border:`1px solid ${C.border}`, boxShadow:"0 1px 3px rgba(0,0,0,0.04)", borderLeft:`3px solid ${color}` }}>
              <div style={{ fontSize:11, fontWeight:700, color, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:5 }}>{key}</div>
              <div style={{ fontSize:14, fontWeight:600, color:C.text }}>{String(value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleView({ doc }) {
  const schedule = asList(doc.releaseSchedule);
  if (!schedule?.length) return (
    <div><SectionTitle icon={"📅"} title={"릴리즈 일정"} /><EmptySectionState label={"릴리즈 일정"} /></div>
  );
  return (
    <div>
      <SectionTitle icon={"📅"} title={"릴리즈 일정"} />
      <div style={{ position:"relative", paddingLeft:28 }}>
        <div style={{ position:"absolute", left:8, top:8, bottom:8, width:2, background:"rgba(0,0,0,0.08)", borderRadius:1 }} />
        {schedule.map((r,i) => (
          <div key={i} style={{ position:"relative", marginBottom:20 }}>
            <div style={{ position:"absolute", left:-24, top:14, width:10, height:10, borderRadius:"50%", background:"#6b6960", border:"2px solid white", boxShadow:"0 0 0 2px rgba(107,105,96,0.3)" }} />
            <div style={{ padding:"14px 18px", borderRadius:12, background:C.card, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{r.milestone}</span>
                {r.date && <span style={{ fontSize:11, color:C.muted, background:"rgba(0,0,0,0.04)", padding:"2px 8px", borderRadius:10 }}>{r.date}</span>}
              </div>
              {r.description && <p style={{ margin:"0 0 8px", fontSize:13, color:"#374151", lineHeight:1.7 }}><SourceText text={r.description} /></p>}
              {asList(r.deliverables).length>0 && (
                <ul style={{ margin:0, paddingLeft:16 }}>
                  {asList(r.deliverables).map((d,j)=><li key={j} style={{ fontSize:13, color:C.muted, lineHeight:1.6, marginBottom:2 }}>{d}</li>)}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HtmlSectionView({ html }) {
  return (
    <div
      className="notion-block-editor"
      dangerouslySetInnerHTML={{ __html: html || `<p style='color:#9ca3af'>내용이 없습니다</p>` }}
      style={{ fontSize:14, lineHeight:1.85, color:C.text }}
    />
  );
}

function SectionContent({ doc, sectionKey, htmlSections }) {
  if (!doc) return <EmptySectionState label="PRD" />;
  if (doc.type === "html") {
    const sec = htmlSections.find(s=>s.key===sectionKey);
    return <HtmlSectionView html={sec?.html||""} />;
  }
  switch (sectionKey) {
    case "overview":  return <OverviewView  doc={doc} />;
    case "goals":     return <GoalsView     doc={doc} />;
    case "features":  return <FeaturesView  doc={doc} />;
    case "personas":  return <PersonasView  doc={doc} />;
    case "mvp":       return <MvpView       doc={doc} />;
    case "techstack": return <TechStackView doc={doc} />;
    case "schedule":  return <ScheduleView  doc={doc} />;
    default:          return <EmptySectionState label={sectionKey} />;
  }
}

/* ══════════════════════════════════════
   PRD 사이드바
══════════════════════════════════════ */
function PrdSidebar({ sections, activeKey, onSelect, projectName, onEditAll }) {
  return (
    <div style={{ width:210, flexShrink:0, borderRight:`1px solid ${C.border}`, background:C.surface, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ padding:"16px 14px 10px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.sub, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:3 }}>PRD</div>
        <div style={{ fontSize:14, fontWeight:700, color:C.text, lineHeight:1.35, wordBreak:"break-word" }}>{projectName || "제품 요구사항 문서"}</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"4px 8px 8px" }}>
        {sections.map(sec => {
          const isActive = activeKey===sec.key;
          return (
            <button
              key={sec.key}
              onClick={()=>onSelect(sec.key)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:7, marginBottom:1, background:isActive?"rgba(107,105,96,0.12)":"transparent", border:"none", cursor:"pointer", textAlign:"left", transition:"background 0.1s" }}
              onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background="rgba(0,0,0,0.04)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=isActive?"rgba(107,105,96,0.12)":"transparent"; }}
            >
              <span style={{ fontSize:13, flexShrink:0 }}>{sec.icon}</span>
              <span style={{ fontSize:13, color:isActive?C.text:C.muted, fontWeight:isActive?600:400 }}>{sec.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ padding:"10px 12px", borderTop:`1px solid ${C.border}` }}>
        <button
          onClick={onEditAll}
          style={{ width:"100%", padding:"7px 12px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", background:C.accentBg, border:`1px solid ${C.accentBdr}`, color:C.accent, display:"flex", alignItems:"center", gap:6 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          {"전체 편집"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   Notion 에디터 (contentEditable 기반)
══════════════════════════════════════ */
const BLOCK_OPTS = [
  { value: "p",          label: "본문" },
  { value: "h1",         label: "제목 1" },
  { value: "h2",         label: "제목 2" },
  { value: "h3",         label: "제목 3" },
  { value: "blockquote", label: "인용" },
  { value: "pre",        label: "코드" },
];
const FONT_SIZES = [12,13,14,15,16,18,20,24,28,32];
const TEXT_COLORS = [
  { label: "기본", value: "#1a1916" }, { label: "회색", value: "#9ca3af" },
  { label: "빨강", value: "#ef4444" }, { label: "주황", value: "#f97316" },
  { label: "노랑", value: "#ca8a04" }, { label: "초록", value: "#16a34a" },
  { label: "파랑", value: "#2563eb" }, { label: "보라", value: "#7c3aed" },
  { label: "분홍", value: "#db2777" },
];
const HL_COLORS = [
  { label: "없음",  value: "transparent" }, { label: "노랑", value: "#fef9c3" },
  { label: "초록",  value: "#dcfce7"     }, { label: "파랑", value: "#dbeafe" },
  { label: "보라",  value: "#ede9fe"     }, { label: "분홍", value: "#fce7f3" },
  { label: "주황",  value: "#ffedd5"     }, { label: "빨강", value: "#fee2e2" },
  { label: "회색",  value: "#f3f4f6"     },
];

function NotionEditor({ editorRef, onTextChange }) {
  const [blockType, setBlockType] = useState("p");
  const [fontSize,  setFontSize]  = useState(14);
  const [textColor, setTextColor] = useState("#1a1916");
  const [hlColor,   setHlColor]   = useState("transparent");
  const [isBold,    setIsBold]    = useState(false);
  const [isItalic,  setIsItalic]  = useState(false);
  const [colorMenu, setColorMenu] = useState(null);

  function exec(cmd, val = null) { editorRef.current?.focus(); document.execCommand(cmd, false, val); syncState(true); }
  function syncState(contentChanged = false) {
    if (!editorRef.current) return;
    try { setIsBold(document.queryCommandState("bold")); setIsItalic(document.queryCommandState("italic")); } catch {}
    if (contentChanged && onTextChange) onTextChange(editorRef.current.innerText || "");
    const sel = window.getSelection();
    if (sel?.rangeCount) {
      let el = sel.getRangeAt(0).startContainer;
      if (el.nodeType === 3) el = el.parentElement;
      while (el && el !== editorRef.current) {
        const tag = el.tagName?.toLowerCase();
        if (BLOCK_OPTS.some(o => o.value === tag)) { setBlockType(tag); break; }
        el = el.parentElement;
      }
    }
  }
  function setBlock(tag) { editorRef.current?.focus(); document.execCommand("formatBlock", false, tag); setBlockType(tag); syncState(true); }
  function applyFontSize(size) {
    setFontSize(size);
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editorRef.current) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = size + "px";
    try { range.surroundContents(span); } catch { const f = range.extractContents(); span.appendChild(f); range.insertNode(span); }
    syncState(true);
  }
  function applyTextColor(color) { setTextColor(color); exec("foreColor", color); setColorMenu(null); }
  function applyHL(color) {
    setHlColor(color); editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(color === "transparent" ? "removeFormat" : "hiliteColor", false, color === "transparent" ? null : color);
    setColorMenu(null); syncState(true);
  }
  function handleKeyDown(e) {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "b") { e.preventDefault(); exec("bold"); }
      else if (e.key === "i") { e.preventDefault(); exec("italic"); }
      else if (e.key === "u") { e.preventDefault(); exec("underline"); }
    }
    if (e.key === "Tab") { e.preventDefault(); exec("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;"); }
  }

  const Btn = ({ label, active, onClick, title, xs }) => (
    <button onMouseDown={e => { e.preventDefault(); onClick(); }} title={title} style={{
      minWidth: 28, height: 26, borderRadius: 5, border: "none", cursor: "pointer",
      background: active ? "rgba(107,105,96,0.15)" : "none",
      color: active ? C.text : C.muted, fontSize: 12, fontWeight: 600,
      padding: "0 5px", display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.1s", ...xs,
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = active ? "rgba(107,105,96,0.15)" : "none"; }}
    >{label}</button>
  );
  const Sep = () => <div style={{ width: 1, height: 18, background: C.border, margin: "0 3px", flexShrink: 0 }} />;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 툴바 */}
      <div style={{ height: 42, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 14px", gap: 2, borderBottom: `1px solid ${C.border}`, background: "#f7f6f3", overflowX: "auto" }}>
        <select value={blockType} onChange={e => setBlock(e.target.value)} style={{ height: 26, padding: "0 6px", borderRadius: 6, border: `1px solid ${C.border}`, background: "#f7f6f3", fontSize: 11, fontWeight: 600, color: C.text, cursor: "pointer", outline: "none", marginRight: 2 }}>
          {BLOCK_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Sep />
        <Btn label="B" active={isBold}   onClick={() => exec("bold")}          title="굵게 (Ctrl+B)"   xs={{ fontWeight: 800 }} />
        <Btn label="I" active={isItalic} onClick={() => exec("italic")}        title="기울임 (Ctrl+I)" xs={{ fontStyle: "italic" }} />
        <Btn label="U" active={false}    onClick={() => exec("underline")}     title="밑줄 (Ctrl+U)"   xs={{ textDecoration: "underline" }} />
        <Btn label="S" active={false}    onClick={() => exec("strikeThrough")} title="취소선"           xs={{ textDecoration: "line-through" }} />
        <Sep />
        <select value={fontSize} onChange={e => applyFontSize(Number(e.target.value))} style={{ height: 26, padding: "0 4px", borderRadius: 6, border: `1px solid ${C.border}`, background: "#f7f6f3", fontSize: 11, color: C.text, cursor: "pointer", outline: "none" }}>
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <Sep />
        {/* 글자 색상 */}
        <div style={{ position: "relative" }}>
          <button onMouseDown={e => { e.preventDefault(); setColorMenu(colorMenu === "text" ? null : "text"); }} title="글자 색상"
            style={{ width: 30, height: 26, borderRadius: 5, border: "none", cursor: "pointer", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: textColor, lineHeight: 1 }}>A</span>
            <div style={{ width: 16, height: 3, borderRadius: 2, background: textColor }} />
          </button>
          {colorMenu === "text" && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onMouseDown={() => setColorMenu(null)} />
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100, background: "white", border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, width: 132 }}>
                {TEXT_COLORS.map(col => (
                  <button key={col.value} onMouseDown={e => { e.preventDefault(); applyTextColor(col.value); }} title={col.label}
                    style={{ height: 28, borderRadius: 6, cursor: "pointer", background: col.value, border: textColor === col.value ? "2px solid #6b6960" : "1px solid rgba(0,0,0,0.1)", color: ["#1a1916","#7c3aed","#2563eb","#db2777"].includes(col.value) ? "white" : "#1a1916", fontSize: 9, fontWeight: 700 }}>
                    {col.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {/* 형광펜 */}
        <div style={{ position: "relative" }}>
          <button onMouseDown={e => { e.preventDefault(); setColorMenu(colorMenu === "hl" ? null : "hl"); }} title="형광펜"
            style={{ width: 30, height: 26, borderRadius: 5, border: "none", cursor: "pointer", background: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text, lineHeight: 1, background: hlColor !== "transparent" ? hlColor : "none", padding: "0 2px", borderRadius: 2 }}>H</span>
            <div style={{ width: 16, height: 3, borderRadius: 2, background: hlColor !== "transparent" ? hlColor : C.border }} />
          </button>
          {colorMenu === "hl" && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onMouseDown={() => setColorMenu(null)} />
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 100, background: "white", border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, width: 132 }}>
                {HL_COLORS.map(col => (
                  <button key={col.value} onMouseDown={e => { e.preventDefault(); applyHL(col.value); }} title={col.label}
                    style={{ height: 28, borderRadius: 6, cursor: "pointer", background: col.value === "transparent" ? "repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 2px,white 2px,white 8px)" : col.value, border: hlColor === col.value ? "2px solid #6b6960" : "1px solid rgba(0,0,0,0.1)", color: "#1a1916", fontSize: 9, fontWeight: 700 }}>
                    {col.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <Sep />
        <Btn label="• ≡"  active={false} onClick={() => exec("insertUnorderedList")} title="글머리 기호" />
        <Btn label="1. ≡" active={false} onClick={() => exec("insertOrderedList")}   title="번호 목록" />
        <Sep />
        <Btn label="→" active={false} onClick={() => exec("indent")}  title="들여쓰기" />
        <Btn label="←" active={false} onClick={() => exec("outdent")} title="내어쓰기" />
        <Sep />
        <Btn label="🔗" active={false} onClick={() => { const url = prompt("링크 URL:"); if (url) exec("createLink", url); }} title="링크 삽입" />
        <Btn label="⎯"  active={false} onClick={() => exec("insertHorizontalRule")} title="구분선" />
      </div>

      {/* 편집 영역 */}
      <div style={{ flex: 1, overflowY: "auto", background: C.bg }}>
        <div
          ref={editorRef}
          contentEditable suppressContentEditableWarning
          onInput={() => syncState(true)} onKeyDown={handleKeyDown} onMouseUp={() => syncState(false)} onKeyUp={() => syncState(false)}
          data-placeholder="PRD를 작성하세요..."
          className="prd-notion-editor"
          style={{ minHeight: "100%", maxWidth: 720, margin: "0 auto", padding: "48px 56px 120px", outline: "none", fontSize: 14, lineHeight: 1.85, color: C.text, fontFamily: "'Pretendard','Noto Sans KR',sans-serif" }}
        />
      </div>

      <style>{`
        .prd-notion-editor[data-placeholder]:empty::before { content: attr(data-placeholder); color: var(--text-3); pointer-events: none; display: block; }
        .prd-notion-editor h1 { font-size: 28px; font-weight: 900; color: #1a1916; margin: 0 0 16px; line-height: 1.25; }
        .prd-notion-editor h2 { font-size: 20px; font-weight: 700; color: #1a1916; margin: 32px 0 10px; padding-bottom: 6px; border-bottom: 1px solid rgba(0,0,0,0.08); }
        .prd-notion-editor h3 { font-size: 16px; font-weight: 600; color: #1a1916; margin: 22px 0 6px; }
        .prd-notion-editor p  { margin: 5px 0; }
        .prd-notion-editor ul { padding-left: 24px; margin: 6px 0; }
        .prd-notion-editor ol { padding-left: 26px; margin: 6px 0; }
        .prd-notion-editor li { margin: 4px 0; line-height: 1.7; }
        .prd-notion-editor blockquote { border-left: 3px solid #6b6960; margin: 12px 0; padding: 10px 18px; background: rgba(107,105,96,0.07); border-radius: 0 8px 8px 0; color: #6b6960; font-style: italic; }
        .prd-notion-editor pre { background: #f0eeeb; padding: 14px 18px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.08); overflow-x: auto; margin: 12px 0; font-family: 'JetBrains Mono','Fira Code',monospace; font-size: 13px; color: #6b6960; white-space: pre; }
        .prd-notion-editor code { background: rgba(107,105,96,0.12); padding: 1px 5px; border-radius: 3px; font-family: monospace; font-size: 0.88em; color: #6b6960; }
        .prd-notion-editor a { color: #6b6960; text-decoration: underline; }
        .prd-notion-editor hr { border: none; border-top: 1px solid rgba(0,0,0,0.1); margin: 20px 0; }
        .prd-notion-editor:focus { outline: none; }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════
   PRD PANEL
══════════════════════════════════════ */
export function PrdPanel({ project, readOnly = false, onDocumentChange, onDocumentSaved, onDocumentEditingChange }) {
  const editorRef      = useRef(null);
  const [text,          setText]         = useState("");
  const [hasDraft,      setHasDraft]     = useState(false);
  const [saving,        setSaving]       = useState(false);
  const [saved,         setSaved]        = useState(false);
  const [editMode,      setEditMode]     = useState(false);
  const [activeSection, setActiveSection]= useState("overview");

  const doc       = project?.prdDocument;
  const isHtmlDoc = doc?.type === "html";

  const htmlSections = useMemo(() => {
    if (!isHtmlDoc) return [];
    return parseSectionsFromHtml(doc?.htmlContent || "");
  }, [isHtmlDoc, doc?.htmlContent]);

  const availableSections = useMemo(() => {
    if (!doc) return [];
    if (isHtmlDoc) return htmlSections.length>0 ? htmlSections : [{ key:"__all__", label:"전체", icon:"📄" }];
    return PRD_SECTIONS.filter(s=>sectionHasData(doc, s.key));
  }, [doc, isHtmlDoc, htmlSections]);

  useEffect(() => {
    if (availableSections.length>0) {
      const exists = availableSections.some(s=>s.key===activeSection);
      if (!exists) setActiveSection(availableSections[0].key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSections]);

  /* contentEditable 에디터 초기화 */
  useEffect(() => {
    if (!editorRef.current) return;
    if (doc && typeof doc === "object") {
      const html = doc.htmlContent || (doc.type === "html" ? "<p><br></p>" : prdJsonToHtml(doc));
      editorRef.current.innerHTML = html;
      setText(editorRef.current.innerText || "");
      setHasDraft(true);
    } else {
      editorRef.current.innerHTML = "<p><br></p>";
      setText("");
      setHasDraft(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, doc?.projectOverview ?? null, doc?.type ?? null]);

  async function handleSave() {
    const artifactId = project?.artifactIds?.PRD;
    if (!artifactId) return;
    const htmlContent = editorRef.current?.innerHTML;
    if (!htmlContent || htmlContent === "<p><br></p>" || htmlContent === "<p></p>") return;
    // 원본 구조화 필드 전체 보존, htmlContent만 추가/갱신
    const nextDoc = { ...(doc || {}), htmlContent };
    const content = JSON.stringify(nextDoc);
    setSaving(true);
    try {
      await updateArtifact(artifactId, content);
      onDocumentEditingChange?.("PRD", false);
      onDocumentChange?.(nextDoc);
      onDocumentSaved?.({ sourceType: "PRD", document: nextDoc });
      setSaved(true); setTimeout(()=>setSaved(false), 3000);
    } catch(e) { alert("저장 실패: "+e.message); }
    finally { setSaving(false); }
  }

  /**
   * AI가 제안한 섹션 수정안을 문서에 반영한다.
   *
   * 예전에는 AI 답변 텍스트를 커서 위치에 insertHTML로 끼워 넣었다 — 대화체까지
   * 그대로 문서에 박히고 기존 내용은 전혀 교체되지 않았다. 지금은 구조화된
   * PRD JSON의 해당 섹션만 통째로 갈아끼우고, htmlContent를 다시 생성해
   * 편집기와 저장본이 어긋나지 않게 맞춘다.
   *
   * 실패하면 예외를 던진다 — 사이드바가 그걸 받아 사용자에게 알린다.
   */
  async function handleApplyEdits(edits) {
    if (!doc || !edits?.length) return;

    // 저장할 곳이 없으면 화면만 바꿔놓고 "적용했다"고 안내하는 상태가 된다 —
    // 새로고침하면 사라지므로 차라리 실패로 알린다
    const artifactId = project?.artifactIds?.PRD;
    if (!artifactId) {
      throw new Error("저장 대상 PRD를 찾을 수 없습니다. 문서를 다시 불러온 뒤 시도해 주세요.");
    }

    const nextDoc = { ...doc };
    edits.forEach(e => { nextDoc[e.section] = e.after; });
    nextDoc.htmlContent = prdJsonToHtml(nextDoc);

    // 승인한 수정은 곧바로 저장한다. 저장이 실패하면 편집기를 건드리지 않고
    // 예외를 그대로 올려보내 사이드바가 실패를 알리게 한다
    await updateArtifact(artifactId, JSON.stringify(nextDoc));

    if (editorRef.current) {
      editorRef.current.innerHTML = nextDoc.htmlContent;
      setText(editorRef.current.innerText || "");
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);

    onDocumentChange?.(nextDoc);
    onDocumentEditingChange?.("PRD", false);
    onDocumentSaved?.({ sourceType: "PRD", document: nextDoc });
  }

  function handleExportPdf() {
    const content = editorRef.current?.innerHTML;
    if (!content || content === "<p><br></p>" || content === "<p></p>") return;
    const projectName = project?.name || "PRD";
    const now = new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"});
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${projectName} — PRD</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700;900&display=swap');
@page{margin:20mm 25mm;size:A4}body{font-family:'Noto Sans KR',sans-serif;color:#1a1916;line-height:1.75;font-size:14px}
.doc-header{border-bottom:2px solid #1a1916;padding-bottom:14px;margin-bottom:36px}
.doc-header .title{font-size:11px;font-weight:700;color:#6b6960;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.doc-header h1{font-size:26px;font-weight:900;margin:0 0 6px}.doc-header .meta{font-size:11px;color:#9ca3af}
h1{font-size:24px;font-weight:900;margin:0 0 14px}h2{font-size:17px;font-weight:700;margin:32px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,0.1)}
h3{font-size:14px;font-weight:600;margin:20px 0 6px;color:#374151}p{margin:5px 0}ul{padding-left:22px;margin:6px 0}ol{padding-left:24px;margin:6px 0}li{margin:4px 0}
blockquote{border-left:3px solid #6b6960;margin:12px 0;padding:10px 16px;background:rgba(107,105,96,0.07);color:#6b6960;border-radius:0 6px 6px 0}
pre{background:#f5f4f0;padding:12px 16px;border-radius:6px;border:1px solid rgba(0,0,0,0.08);margin:10px 0;font-family:monospace;font-size:12px;white-space:pre-wrap}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
<div class="doc-header"><div class="title">Product Requirements Document</div><h1>${projectName}</h1><div class="meta">생성일 ${now} · Timiroom AI</div></div>
${content}</body></html>`;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    const d = iframe.contentDocument||iframe.contentWindow.document;
    d.open(); d.write(html); d.close();
    setTimeout(()=>{ iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(()=>document.body.removeChild(iframe),1000); },600);
  }

  const PdfBtn = ({ disabled }) => (
    <button onClick={handleExportPdf} disabled={disabled} style={{ padding:"5px 12px", borderRadius:7, fontSize:12, fontWeight:600, background:!disabled?C.accentBg:"rgba(0,0,0,0.04)", border:`1px solid ${!disabled?C.accentBdr:"rgba(0,0,0,0.08)"}`, color:!disabled?C.accent:"#9ca3af", cursor:!disabled?"pointer":"not-allowed", display:"flex", alignItems:"center", gap:5 }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/>
      </svg>
      PDF
    </button>
  );

  return (
    <div style={{ flex:1, display:"flex", height:"100vh", overflow:"hidden", background:C.bg, fontFamily:"'Pretendard','Noto Sans KR',sans-serif" }}>

      {/* ── 뷰 모드 ── */}
      {!editMode && (
        <>
          <PrdSidebar
            sections={availableSections}
            activeKey={activeSection}
            onSelect={key=>setActiveSection(key)}
            projectName={project?.name}
            onEditAll={readOnly ? undefined : ()=>setEditMode(true)}
          />
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ height:48, flexShrink:0, display:"flex", alignItems:"center", padding:"0 20px", gap:8, borderBottom:`1px solid ${C.border}`, background:C.surface, justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {project && <>
                  <div style={{ width:20, height:20, borderRadius:5, background:`${project.color||"var(--text-1)"}22`, border:`1px solid ${project.color||"var(--text-1)"}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:900, color:project.color||"#6b6960" }}>{(project.name||"P").charAt(0).toUpperCase()}</div>
                  <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{project.name}</span>
                  <span style={{ fontSize:13, color:C.sub }}>›</span>
                </>}
                <span style={{ fontSize:13, fontWeight:500, color:C.accent, padding:"2px 8px", borderRadius:6, background:C.accentBg, border:`1px solid ${C.accentBdr}` }}>PRD</span>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {hasDraft && <span style={{ fontSize:11, padding:"3px 8px", borderRadius:5, background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.25)", color:"#34d399", fontWeight:600 }}>{"✓ AI 초안"}</span>}
                <PdfBtn disabled={!hasDraft} />
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              {!doc ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"80px 0", gap:14 }}>
                  <div style={{ fontSize:32 }}>{"📄"}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:C.text }}>PRD{"가 없습니다"}</div>
                  <div style={{ fontSize:13, color:C.muted }}>{"파이프라인을 실행하거나 편집 모드에서 작성하세요"}</div>
                  {!readOnly && <button onClick={()=>setEditMode(true)} style={{ marginTop:4, padding:"8px 18px", borderRadius:8, fontSize:13, fontWeight:600, background:C.accentBg, border:`1px solid ${C.accentBdr}`, color:C.accent, cursor:"pointer" }}>{"편집 모드 열기"}</button>}
                </div>
              ) : (
                <div style={{ maxWidth:780, margin:"0 auto", padding:"32px 36px 80px" }}>
                  <SectionContent doc={doc} sectionKey={activeSection} htmlSections={htmlSections} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── 편집 모드: 항상 마운트, 뷰 모드에서 숨김 ── */}
      <div style={{ display:editMode?"flex":"none", flex:1, flexDirection:"column", overflow:"hidden" }}>
        <div style={{ height:48, flexShrink:0, display:"flex", alignItems:"center", padding:"0 20px", gap:8, borderBottom:`1px solid ${C.border}`, background:C.surface }}>
          <button onClick={()=>setEditMode(false)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:7, fontSize:12, fontWeight:600, background:"rgba(0,0,0,0.04)", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          {project && <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{project.name}</span>}
          <span style={{ fontSize:13, color:C.sub }}>›</span>
          <span style={{ fontSize:13, fontWeight:500, color:C.accent, padding:"2px 8px", borderRadius:6, background:C.accentBg, border:`1px solid ${C.accentBdr}` }}>PRD {"편집"}</span>
          <div style={{ flex:1 }} />
          {saved && <span style={{ fontSize:11, padding:"3px 8px", borderRadius:5, background:"rgba(52,211,153,0.1)", border:"1px solid rgba(52,211,153,0.25)", color:"#34d399", fontWeight:600 }}>{"✓ 저장됨"}</span>}
          <button onClick={handleSave} disabled={saving||!project?.artifactIds?.PRD||readOnly} style={{ padding:"5px 12px", borderRadius:7, fontSize:12, fontWeight:600, background:saved?"rgba(52,211,153,0.15)":project?.artifactIds?.PRD?"rgba(96,165,250,0.12)":"rgba(0,0,0,0.04)", border:`1px solid ${saved?"rgba(52,211,153,0.4)":project?.artifactIds?.PRD?"rgba(96,165,250,0.35)":"rgba(0,0,0,0.08)"}`, color:saved?"#34d399":project?.artifactIds?.PRD?"#60a5fa":"#9ca3af", cursor:saving||!project?.artifactIds?.PRD?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:5, opacity:saving?0.7:1 }}>
            {saved ? "저장됨" : saving ? "저장 중..." : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                </svg>
                {"저장"}
              </>
            )}
          </button>
          <PdfBtn disabled={!hasDraft} />
        </div>
        <NotionEditor editorRef={editorRef} onTextChange={nextText => {
          setText(nextText);
          onDocumentEditingChange?.("PRD", true);
        }} />
      </div>

      {/* html 타입 문서는 섹션 키가 없어 구조화 편집이 불가능하다 — 상담 모드로만 붙인다 */}
      <AiChatDock
        contextType="prd"
        project={project}
        currentContent={text}
        document={!readOnly && doc && !isHtmlDoc ? doc : null}
        onApplyEdits={!readOnly && doc && !isHtmlDoc ? handleApplyEdits : undefined}
      />
    </div>
  );
}
