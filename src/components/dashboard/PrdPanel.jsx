"use client";

import { confirmDialog, toast } from "@/lib/feedback";
import { ActionButton, Badge, EmptyState, Icon, MarkdownEditor, PanelHeader } from "@/components/ui";
import { useState, useEffect, useMemo, useRef } from "react";
import { AiChatDock } from "./AiChatDock";
import { updateArtifact } from "@/lib/pipelineApi";
import { htmlToMarkdown, renderMarkdown, sanitizeHtml } from "@/lib/markdownRender";
import { extraSections, markdownToPrd, prdToMarkdownWithExtras } from "@/lib/prdMarkdown.mjs";
import { isLightColor, techStackCards } from "@/lib/techStack.mjs";

const C = {
  bg:        "var(--surface)",
  surface:   "var(--bg)",
  border:    "rgba(0,0,0,0.07)",
  text:      "var(--text-1)",
  muted:     "var(--text-3)",
  sub:       "var(--text-3)",
  accent:    "var(--text-2)",
  accentBg:  "color-mix(in srgb, var(--text-2) 10%, transparent)",
  accentBdr: "color-mix(in srgb, var(--text-2) 25%, transparent)",
  card:      "#ffffff",
};

const PRD_SECTIONS = [
  { key: "overview",  label: "프로젝트 개요",   icon: "overview", fields: ["projectOverview","background"] },
  { key: "goals",     label: "목표 & KPI",      icon: "target", fields: ["goals","kpi"] },
  { key: "features",  label: "핵심 기능",        icon: "star",     fields: ["coreFeatures"] },
  { key: "personas",  label: "사용자 페르소나",  icon: "users", fields: ["userPersonas"] },
  { key: "mvp",       label: "MVP 범위",         icon: "box", fields: ["mvpScope"] },
  { key: "techstack", label: "기술 스택",        icon: "wrench", fields: ["techStack"] },
  { key: "schedule",  label: "릴리즈 일정",      icon: "calendar", fields: ["releaseSchedule"] },
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

/** 문서 제목(h2)의 낱말로 섹션 아이콘을 고른다. 맞는 낱말이 없으면 문서 아이콘. */
const SECTION_ICON_RULES = [
  [/개요|소개|요약|overview/i, "overview"],
  [/배경|문제|background/i, "flag"],
  [/목표|목적|kpi|goal/i, "target"],
  [/요구사항|요건|requirement/i, "checklist"],
  [/스토리|페르소나|사용자|user/i, "users"],
  [/기능|feature/i, "star"],
  [/범위|mvp|scope/i, "box"],
  [/기술|스택|아키텍처|tech/i, "wrench"],
  [/일정|릴리즈|마일스톤|schedule/i, "calendar"],
];
function sectionIcon(label) {
  return SECTION_ICON_RULES.find(([pattern]) => pattern.test(label || ""))?.[1] ?? "doc";
}

/** 섹션 아이콘. 색은 쓰지 않고 모양으로만 섹션을 구분한다. */
function SectionIcon({ name, size }) {
  return <Icon name={name} size={size} strokeWidth={1.8} style={{ flexShrink: 0, color: "var(--text-1)" }} />;
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
      current = { key: node.textContent, label: node.textContent, icon: sectionIcon(node.textContent), html: node.outerHTML };
    } else if (tag === "H1" && !current) {
      current = { key: "__overview__", label: "개요", icon: "overview", html: node.outerHTML };
    } else if (current) {
      current.html += node.outerHTML || "";
    } else {
      if (!current) current = { key: "__overview__", label: "개요", icon: "overview", html: "" };
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
        <SectionIcon name={icon} size={22} />
        <h1 style={{ margin:0, fontSize:22, fontWeight:800, color:C.text }}>{title}</h1>
      </div>
      <div style={{ height:2, background:"rgba(0,0,0,0.06)", borderRadius:1 }} />
    </div>
  );
}

function EmptySectionState({ label }) {
  return (
    <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
      <div style={{ marginBottom:12, color:C.muted }}><Icon name="doc" size={30} strokeWidth={1.6} /></div>
      <div style={{ fontSize:14, fontWeight:600 }}>{label} {"정보가 없습니다"}</div>
      <div style={{ fontSize:12, marginTop:4 }}>{"파이프라인을 실행하거나 편집 모드에서 추가하세요"}</div>
    </div>
  );
}

function OverviewView({ doc }) {
  return (
    <div>
      <SectionTitle icon="overview" title={"프로젝트 개요"} />
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
      <SectionTitle icon="target" title={"목표 & KPI"} />
      {goals.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.sub, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>{"목표"}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {goals.map((g,i) => (
              <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", padding:"12px 16px", borderRadius:10, background:C.card, border:`1px solid ${C.border}`, boxShadow:"0 1px 3px rgba(0,0,0,0.03)" }}>
                <span style={{ fontSize:11, fontWeight:800, color:"var(--text-2)", background:"color-mix(in srgb, var(--text-2) 10%, transparent)", border:"1px solid color-mix(in srgb, var(--text-2) 20%, transparent)", padding:"2px 7px", borderRadius:5, flexShrink:0, marginTop:1 }}>{i+1}</span>
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
    <div><SectionTitle icon="star" title={"핵심 기능"} /><EmptySectionState label={"핵심 기능"} /></div>
  );
  return (
    <div>
      <SectionTitle icon="star" title={"핵심 기능"} />
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
                  <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:f.description||asList(f.requirements).length?8:0 }}>{f.name}</div>
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
    <div><SectionTitle icon="users" title={"사용자 페르소나"} /><EmptySectionState label={"사용자 페르소나"} /></div>
  );
  return (
    <div>
      <SectionTitle icon="users" title={"사용자 페르소나"} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
        {personas.map((p,i) => (
          <div key={i} style={{ padding:"18px 20px", borderRadius:14, background:C.card, border:`1px solid ${C.border}`, boxShadow:"0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:"color-mix(in srgb, var(--text-2) 10%, transparent)", border:"1px solid color-mix(in srgb, var(--text-2) 20%, transparent)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}><Icon name="users" size={18} strokeWidth={1.7} /></div>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:C.text }}>{p.name}</div>
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
    <div><SectionTitle icon="box" title={"MVP 범위"} /><EmptySectionState label={"MVP 범위"} /></div>
  );
  const included = asList(mvp.included);
  const excluded = asList(mvp.excluded);
  return (
    <div>
      <SectionTitle icon="box" title={"MVP 범위"} />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        {included.length>0 && (
          <div style={{ padding:"16px 18px", borderRadius:12, background:"#f0fdf4", border:"1px solid #bbf7d0" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#15803d", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>{"포함"}</div>
            <ul style={{ margin:0, paddingLeft:16 }}>
              {included.map((item,i)=><li key={i} style={{ fontSize:13, color:"#166534", lineHeight:1.7, marginBottom:3 }}>{item}</li>)}
            </ul>
          </div>
        )}
        {excluded.length>0 && (
          <div style={{ padding:"16px 18px", borderRadius:12, background:"#fef2f2", border:"1px solid #fecaca" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#dc2626", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:10 }}>{"제외"}</div>
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

/**
 * 기술 로고 타일. 화면은 모노크롬이고 색은 로고에만 둔다. 밝은 브랜드색(JavaScript 노랑)은 어두운 타일에 올린다.
 * logos가 아직 없으면(불러오는 중) 빈 타일만 그려 대체 아이콘이 깜빡이지 않게 한다.
 */
function TechLogo({ tech, logos, fallbackIcon }) {
  const logo = tech?.slug && logos ? logos[tech.slug] : null;
  const loading = tech?.slug && !logos;
  const dark = logo && isLightColor(logo.hex);
  return (
    <div title={tech?.name} style={{ width:36, height:36, borderRadius:10, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:dark?"var(--text-1)":"var(--bg)", border:`1px solid ${C.border}` }}>
      {logo
        ? <svg width={20} height={20} viewBox="0 0 24 24" fill={logo.hex} aria-hidden="true"><path d={logo.path} /></svg>
        : !loading && <Icon name={fallbackIcon} size={18} strokeWidth={1.7} style={{ color:"var(--text-2)" }} />}
    </div>
  );
}

function TechStackView({ doc }) {
  const cards = useMemo(() => techStackCards(doc.techStack), [doc.techStack]);
  const [logos, setLogos] = useState(null);
  // 로고 데이터는 커서 이 화면을 열 때만 따로 받는다.
  useEffect(() => {
    let alive = true;
    import("@/lib/techLogos.mjs").then(m => { if (alive) setLogos(m.TECH_LOGOS); }).catch(() => { if (alive) setLogos({}); });
    return () => { alive = false; };
  }, []);
  if (!cards.length) return (
    <div><SectionTitle icon="wrench" title={"기술 스택"} /><EmptySectionState label={"기술 스택"} /></div>
  );
  return (
    <div>
      <SectionTitle icon="wrench" title={"기술 스택"} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
        {cards.map(card => (
          <div key={card.key} style={{ padding:"16px 18px", borderRadius:12, background:C.card, border:`1px solid ${C.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", display:"flex", flexDirection:"column", gap:10 }}>
            {/* 로고 3개 + 긴 라벨이 한 줄에 안 들어가면 라벨이 다음 줄 오른쪽으로 내려간다 */}
            <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:6 }}>
              {card.techs.length
                ? card.techs.map(t => <TechLogo key={t.name} tech={t} logos={logos} fallbackIcon={card.icon} />)
                : <TechLogo fallbackIcon={card.icon} />}
              <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, letterSpacing:"0.03em", color:"var(--text-2)", background:"rgba(0,0,0,0.04)", padding:"3px 10px", borderRadius:100, flexShrink:0 }}>{card.label}</span>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:C.text, lineHeight:1.4 }}>{card.title}</div>
            {/* 설명은 첫 문장 두 줄까지. 전체 문장은 마우스를 올리면 보이고, 편집 모드에 그대로 있다. */}
            {card.summary && (
              <p title={card.full} style={{ margin:0, fontSize:13, color:"var(--text-2)", lineHeight:1.6, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                <SourceText text={card.summary} />
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleView({ doc }) {
  const schedule = asList(doc.releaseSchedule);
  if (!schedule?.length) return (
    <div><SectionTitle icon="calendar" title={"릴리즈 일정"} /><EmptySectionState label={"릴리즈 일정"} /></div>
  );
  return (
    <div>
      <SectionTitle icon="calendar" title={"릴리즈 일정"} />
      <div style={{ position:"relative", paddingLeft:28 }}>
        <div style={{ position:"absolute", left:8, top:8, bottom:8, width:2, background:"rgba(0,0,0,0.08)", borderRadius:1 }} />
        {schedule.map((r,i) => (
          <div key={i} style={{ position:"relative", marginBottom:20 }}>
            <div style={{ position:"absolute", left:-24, top:14, width:10, height:10, borderRadius:"50%", background:"var(--text-2)", border:"2px solid white", boxShadow:"0 0 0 2px color-mix(in srgb, var(--text-2) 30%, transparent)" }} />
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

// 저장된 HTML은 사용자가 쓴 글이라 반드시 걸러서 넣는다.
function HtmlSectionView({ html }) {
  const safe = sanitizeHtml(html);
  if (!safe) return <p style={{ color:C.muted, fontSize:14 }}>내용이 없습니다</p>;
  return <div className="md-preview" dangerouslySetInnerHTML={{ __html: safe }} />;
}

function SectionContent({ doc, sectionKey, htmlSections, extras = [] }) {
  if (!doc) return <EmptySectionState label="PRD" />;
  const extra = extras.find((section) => section.key === sectionKey);
  if (extra) return <HtmlSectionView html={renderMarkdown(extra.markdown)} />;
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
    <div className="prd-side" style={{ width:210, flexShrink:0, borderRight:`1px solid ${C.border}`, background:C.surface, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div className="prd-side__title" style={{ padding:"16px 14px 10px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:C.sub, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:3 }}>PRD</div>
        <div style={{ fontSize:14, fontWeight:700, color:C.text, lineHeight:1.35, wordBreak:"break-word" }}>{projectName || "제품 요구사항 문서"}</div>
      </div>
      <div className="prd-side__list" style={{ flex:1, overflowY:"auto", padding:"4px 8px 8px" }}>
        {sections.map(sec => {
          const isActive = activeKey===sec.key;
          return (
            <button
              key={sec.key}
              onClick={()=>onSelect(sec.key)}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:7, marginBottom:1, background:isActive?"color-mix(in srgb, var(--text-2) 12%, transparent)":"transparent", border:"none", cursor:"pointer", textAlign:"left", transition:"background 0.1s" }}
              onMouseEnter={e=>{ if(!isActive) e.currentTarget.style.background="rgba(0,0,0,0.04)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=isActive?"color-mix(in srgb, var(--text-2) 12%, transparent)":"transparent"; }}
            >
              <SectionIcon name={sec.icon} size={15} />
              <span style={{ fontSize:13, color:isActive?C.text:C.muted, fontWeight:isActive?600:400 }}>{sec.label}</span>
            </button>
          );
        })}
      </div>
      <div className="prd-side__foot" style={{ padding:"10px 12px", borderTop:`1px solid ${C.border}` }}>
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
   PRD PANEL
══════════════════════════════════════ */
export function PrdPanel({ project, readOnly = false, onDocumentChange, onDocumentSaved, onDocumentEditingChange, onProposeDocument }) {
  const [markdown,      setMarkdown]     = useState("");
  const dirtyRef = useRef(false); // 저장하지 않은 편집이 있으면 문서를 다시 받아도 편집기를 덮어쓰지 않는다
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

  // 마크다운 편집에서 정해진 PRD 항목 밖에 쓴 섹션. 구조화 문서에는 없으니 따로 보여 준다.
  const extras = useMemo(() => (
    !isHtmlDoc && doc?.markdown ? extraSections(doc.markdown).map((section) => ({ key:`extra:${section.title}`, label:section.title, icon:"doc", markdown:section.markdown })) : []
  ), [isHtmlDoc, doc?.markdown]);

  const availableSections = useMemo(() => {
    if (!doc) return [];
    if (isHtmlDoc) return htmlSections.length>0 ? htmlSections : [{ key:"__all__", label:"전체", icon:"doc" }];
    return [...PRD_SECTIONS.filter(s=>sectionHasData(doc, s.key)), ...extras];
  }, [doc, isHtmlDoc, htmlSections, extras]);

  // 편집 중 틀 밖 섹션이 생기면 저장 전에 알려 준다.
  const unknownSections = useMemo(() => (
    editMode && doc && !isHtmlDoc ? markdownToPrd(markdown, doc).unknownSections : []
  ), [editMode, doc, isHtmlDoc, markdown]);

  useEffect(() => {
    if (availableSections.length>0) {
      const exists = availableSections.some(s=>s.key===activeSection);
      if (!exists) setActiveSection(availableSections[0].key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableSections]);

  /* 편집기 원문: 구조화 PRD는 정해진 틀의 마크다운으로, HTML 문서는 마크다운으로 옮겨 연다 */
  useEffect(() => {
    if (dirtyRef.current) return;
    if (doc && typeof doc === "object") {
      setMarkdown(isHtmlDoc ? (doc.markdown || htmlToMarkdown(doc.htmlContent)) : prdToMarkdownWithExtras(doc, doc.markdown));
      setHasDraft(true);
    } else {
      setMarkdown("");
      setHasDraft(false);
    }
  // 문서가 새로 들어올 때만 다시 채운다. 편집 중인 글을 덮어쓰지 않도록 의존성을 좁힌다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, doc]);

  // 저장하지 않은 편집이 있으면 확인을 받고, 버리면 저장된 문서로 편집기를 되돌린다.
  async function closeEditor() {
    if (dirtyRef.current) {
      const ok = await confirmDialog("저장하지 않은 변경이 있습니다. 버리고 닫을까요?", { confirmLabel: "버리고 닫기", danger: true });
      if (!ok) return;
      dirtyRef.current = false;
      setMarkdown(doc && typeof doc === "object" ? (isHtmlDoc ? (doc.markdown || htmlToMarkdown(doc.htmlContent)) : prdToMarkdownWithExtras(doc, doc.markdown)) : "");
      onDocumentEditingChange?.("PRD", false);
    }
    setEditMode(false);
  }

  function buildDocument(source) {
    const htmlContent = renderMarkdown(source);
    if (isHtmlDoc) return { ...(doc || {}), markdown: source, htmlContent };
    return { ...markdownToPrd(source, doc || {}).doc, markdown: source, htmlContent };
  }

  async function handleSave() {
    const artifactId = project?.artifactIds?.PRD;
    if (!artifactId) return;
    if (!markdown.trim()) { toast.error("빈 문서는 저장할 수 없습니다."); return; }
    // 마크다운을 구조화 필드로 되돌리고, 틀에 없는 원본 필드는 그대로 둔다.
    const nextDoc = buildDocument(markdown);
    const content = JSON.stringify(nextDoc);
    setSaving(true);
    try {
      if (await onProposeDocument?.({ sourceType: "PRD", document: nextDoc })) return;
      await updateArtifact(artifactId, content);
      dirtyRef.current = false;
      onDocumentEditingChange?.("PRD", false);
      onDocumentChange?.(nextDoc);
      onDocumentSaved?.({ sourceType: "PRD", document: nextDoc });
      setSaved(true); setTimeout(()=>setSaved(false), 3000);
    } catch(e) { toast.error("저장 실패: "+e.message); }
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
    // 바뀐 구조에서 마크다운을 다시 만들어 편집기·저장본·화면이 같은 내용을 보게 한다.
    nextDoc.markdown = prdToMarkdownWithExtras(nextDoc, doc.markdown);
    nextDoc.htmlContent = renderMarkdown(nextDoc.markdown) || prdJsonToHtml(nextDoc);

    const review = await onProposeDocument?.({ sourceType: "PRD", document: nextDoc, deferReview: true });
    if (review) return typeof review === "object" ? review : { pendingApproval: true };

    // 승인한 수정은 곧바로 저장한다. 저장이 실패하면 편집기를 건드리지 않고
    // 예외를 그대로 올려보내 사이드바가 실패를 알리게 한다
    await updateArtifact(artifactId, JSON.stringify(nextDoc));

    dirtyRef.current = false;
    setMarkdown(nextDoc.markdown);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);

    onDocumentChange?.(nextDoc);
    onDocumentEditingChange?.("PRD", false);
    onDocumentSaved?.({ sourceType: "PRD", document: nextDoc });
  }

  function handleExportPdf() {
    const content = renderMarkdown(markdown);
    if (!content) return;
    const projectName = project?.name || "PRD";
    const now = new Date().toLocaleDateString("ko-KR",{year:"numeric",month:"long",day:"numeric"});
    const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${projectName} — PRD</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css">
<style>:root{--text-1:#0d0d0d;--text-2:#5d5d5d;--content-bg:#f9f9f9;--db-bg-elevated:#f3f3f3;--font-mono:'Pretendard','Noto Sans KR',sans-serif}
@page{margin:20mm 25mm;size:A4}body{font-family:'Pretendard','Noto Sans KR',sans-serif;color:var(--text-1);line-height:1.75;font-size:14px}
.doc-header{border-bottom:2px solid var(--text-1);padding-bottom:14px;margin-bottom:36px}
.doc-header .title{font-size:11px;font-weight:700;color:var(--text-2);letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
.doc-header h1{font-size:26px;font-weight:900;margin:0 0 6px}.doc-header .meta{font-size:11px;color:#9ca3af}
h1{font-size:22px;font-weight:900;margin:0 0 14px}h2{font-size:16px;font-weight:700;margin:32px 0 10px;padding-bottom:6px;border-bottom:1px solid rgba(0,0,0,0.1)}
h3{font-size:14px;font-weight:600;margin:20px 0 6px;color:#374151}p{margin:5px 0}ul{padding-left:22px;margin:6px 0}ol{padding-left:24px;margin:6px 0}li{margin:4px 0}
blockquote{border-left:3px solid var(--text-2);margin:12px 0;padding:10px 16px;background:color-mix(in srgb, var(--text-2) 7%, transparent);color:var(--text-2);border-radius:0 6px 6px 0}
pre{background:var(--db-bg-elevated);padding:12px 16px;border-radius:6px;border:1px solid rgba(0,0,0,0.08);margin:10px 0;font-family: var(--font-mono);font-size:12px;white-space:pre-wrap}
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
    <ActionButton onClick={handleExportPdf} disabled={disabled}><Icon name="download" size={12} /> PDF</ActionButton>
  );

  return (
    <div className="prd-layout" style={{ flex:1, display:"flex", height:"100%", minHeight:0, overflow:"hidden", background:"var(--content-bg)", fontFamily:"'Pretendard','Noto Sans KR',sans-serif" }}>

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
          <div className="prd-main" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <PanelHeader project={project} label="PRD" docType="PRD">
              {hasDraft && <Badge tone="success"><Icon name="check" size={11} /> AI 초안</Badge>}
              <PdfBtn disabled={!hasDraft} />
            </PanelHeader>
            <div style={{ flex:1, overflowY:"auto" }}>
              {!doc ? (
                // 편집은 AI가 만든 PRD를 고치는 방식이라, 문서가 없을 때는 편집을 열지 않는다(저장할 곳이 없다).
                <EmptyState icon="doc" title="아직 PRD가 없습니다" description="AI 기획 생성이 끝나면 여기에 PRD가 만들어집니다. 생성이 끝났는데도 비어 있다면 생성 과정에서 실패한 것입니다." />
              ) : (
                <div className="panel-inner">
                  <SectionContent doc={doc} sectionKey={activeSection} htmlSections={htmlSections} extras={extras} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── 편집 모드: 항상 마운트, 뷰 모드에서 숨김 ── */}
      <div style={{ display:editMode?"flex":"none", flex:1, flexDirection:"column", overflow:"hidden" }}>
        <div style={{ height:48, flexShrink:0, display:"flex", alignItems:"center", padding:"0 20px", gap:8, borderBottom:`1px solid ${C.border}`, background:C.surface }}>
          <button onClick={closeEditor} title="편집 닫기" aria-label="편집 닫기" style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:7, fontSize:12, fontWeight:600, background:"rgba(0,0,0,0.04)", border:`1px solid ${C.border}`, color:C.muted, cursor:"pointer" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          {project && <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{project.name}</span>}
          <span style={{ fontSize:13, color:C.sub }}>›</span>
          <Badge>PRD 편집</Badge>
          <div style={{ flex:1 }} />
          {saved && <Badge tone="success"><Icon name="check" size={11} /> 저장됨</Badge>}
          <ActionButton size="sm" variant="primary" onClick={handleSave} disabled={saving || readOnly || !project?.artifactIds?.PRD}>
            <Icon name="save" size={12} /> {saving ? "저장 중…" : "저장"}
          </ActionButton>
          <PdfBtn disabled={!hasDraft} />
        </div>
        <MarkdownEditor
          value={markdown}
          ariaLabel="PRD 본문"
          placeholder={"## 개요\n\n서비스를 한두 문장으로 설명하세요.\n\n## 목표\n\n- 첫 번째 목표"}
          notice={unknownSections.length > 0 ? `'${unknownSections.join("', '")}' 섹션은 정해진 PRD 항목이 아니어서 AI와 정합성 검사에는 쓰이지 않고, 문서 화면에 추가 섹션으로만 보입니다.` : null}
          onChange={(next) => {
            dirtyRef.current = true;
            setMarkdown(next);
            onDocumentEditingChange?.("PRD", true);
          }}
        />
      </div>

      {/* html 타입 문서는 섹션 키가 없어 구조화 편집이 불가능하다 — 상담 모드로만 붙인다 */}
      <AiChatDock
        contextType="prd"
        project={project}
        currentContent={markdown}
        document={!readOnly && doc && !isHtmlDoc ? doc : null}
        onApplyEdits={!readOnly && doc && !isHtmlDoc ? handleApplyEdits : undefined}
      />
    </div>
  );
}
