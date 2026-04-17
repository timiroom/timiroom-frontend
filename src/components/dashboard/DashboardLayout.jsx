"use client";

import { useState } from "react";
import Link from "next/link";
import { STATUS_META, MOCK_PROJECTS, MEMBER_COLORS } from "@/lib/projectData";

/* ── Nav items ── */
const NAV = [
  { id:"overview",  icon:"⬡",  label:"Overview"   },
  { id:"graph",     icon:"🕸",  label:"지식 그래프" },
  { id:"pipeline",  icon:"⚡",  label:"파이프라인"  },
  { id:"specs",     icon:"📄",  label:"명세서"      },
  { id:"prd",       icon:"✏️",  label:"PRD 입력"    },
];

const BOTTOM_NAV = [
  { id:"settings", icon:"⚙️", label:"설정" },
  { id:"docs",     icon:"📚", label:"문서" },
];

const VIEW_TITLES = {
  overview: { title:"Overview",    sub:"프로젝트 정합성 현황"     },
  graph:    { title:"지식 그래프",  sub:"설계 요소 의존관계 시각화" },
  pipeline: { title:"파이프라인",   sub:"멀티 에이전트 실행 현황"   },
  specs:    { title:"명세서",       sub:"자동 생성 산출물"          },
  prd:      { title:"PRD 입력",     sub:"자연어 요구사항 분석"       },
};

/* ── 프로젝트 전환 드롭다운 ── */
function ProjectSwitcher({ project, collapsed, onBackToList }) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[project.status];

  return (
    <div style={{ padding: collapsed ? "10px 0" : "10px 12px", borderBottom: "1px solid var(--db-border)", position: "relative" }}>
      {/* 목록으로 돌아가기 버튼 */}
      {!collapsed && (
        <button
          onClick={onBackToList}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            color: "var(--db-text-muted)", fontSize: 11, fontWeight: 600,
            padding: "4px 0", marginBottom: 8, transition: "var(--db-transition)",
            letterSpacing: ".02em",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--db-purple-300)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--db-text-muted)"}
        >
          ← 프로젝트 목록
        </button>
      )}
      {collapsed && (
        <button
          onClick={onBackToList}
          title="프로젝트 목록"
          style={{
            width: "100%", padding: "8px 0", background: "none", border: "none",
            cursor: "pointer", color: "var(--db-text-muted)", fontSize: 16,
            display: "flex", justifyContent: "center",
          }}
        >←</button>
      )}

      {/* 현재 프로젝트 */}
      {!collapsed && (
        <div
          onClick={() => setOpen(o => !o)}
          style={{
            background: "var(--db-bg-elevated)",
            border: `1px solid ${open ? "var(--db-border-mid)" : "var(--db-border)"}`,
            borderRadius: "var(--db-radius-sm)", padding: "9px 11px",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            transition: "var(--db-transition)",
          }}
        >
          {/* 상태 dot */}
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: meta.color, flexShrink: 0,
            animation: project.status === "running" ? "db-pulse 2s infinite" : "none",
          }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, color: "var(--db-text-muted)", letterSpacing: ".03em" }}>현재 프로젝트</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--db-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {project.name}
            </div>
          </div>
          <span style={{ color: "var(--db-text-muted)", fontSize: 11, transition: "transform .2s", transform: open ? "rotate(180deg)" : "" }}>▾</span>
        </div>
      )}

      {/* 드롭다운 — 다른 프로젝트 목록 */}
      {open && !collapsed && (
        <div style={{
          position: "absolute", top: "100%", left: 12, right: 12, zIndex: 100,
          background: "var(--db-bg-surface)",
          border: "1px solid var(--db-border-mid)",
          borderRadius: "var(--db-radius)", overflow: "hidden",
          boxShadow: "0 12px 32px rgba(0,0,0,.5)",
          animation: "db-fade-up .15s ease",
        }}>
          <div style={{ padding: "8px 10px 4px", fontSize: 10, color: "var(--db-text-muted)", letterSpacing: ".06em", textTransform: "uppercase" }}>
            프로젝트 전환
          </div>
          {MOCK_PROJECTS.map(p => {
            const m = STATUS_META[p.status];
            const isCurrent = p.id === project.id;
            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", cursor: isCurrent ? "default" : "pointer",
                background: isCurrent ? "rgba(139,92,246,.1)" : "transparent",
                transition: "var(--db-transition)",
              }}
              onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = "var(--db-bg-elevated)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? "rgba(139,92,246,.1)" : "transparent"; }}
              onClick={() => setOpen(false)}
              >
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: m.color, flexShrink: 0 }}/>
                <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? "var(--db-purple-200)" : "var(--db-text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 10, color: "var(--db-text-muted)" }}>{p.score}%</span>
                {isCurrent && <span style={{ fontSize: 10, color: "var(--db-purple-300)" }}>●</span>}
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid var(--db-border)", margin: "4px 0" }}/>
          <div
            onClick={() => { setOpen(false); onBackToList(); }}
            style={{ padding: "8px 10px 10px", fontSize: 12, color: "var(--db-purple-300)", cursor: "pointer", fontWeight: 600 }}
          >+ 전체 목록 보기</div>
        </div>
      )}
    </div>
  );
}

/* ── Sidebar ── */
function Sidebar({ active, onSelect, collapsed, onToggle, project, onBackToList }) {
  return (
    <aside style={{
      width: collapsed ? 64 : 224,
      minHeight: "100vh",
      background: "var(--db-bg-surface)",
      borderRight: "1px solid var(--db-border)",
      display: "flex", flexDirection: "column",
      transition: "width 0.3s cubic-bezier(.4,0,.2,1)",
      overflow: "hidden", flexShrink: 0,
      position: "relative", zIndex: 10,
    }}>
      {/* Logo */}
      <Link href="/dashboard" onClick={onBackToList} style={{
        padding: collapsed ? "18px 0" : "18px 18px",
        display: "flex", alignItems: "center", gap: 10,
        borderBottom: "1px solid var(--db-border)",
        justifyContent: collapsed ? "center" : "flex-start",
        textDecoration: "none",
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: "var(--db-grad-purple)", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 900, color: "white",
          boxShadow: "var(--db-glow-md)",
        }}>A</div>
        {!collapsed && (
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--db-purple-300)", whiteSpace: "nowrap" }}>
            Align-it
          </span>
        )}
      </Link>

      {/* 프로젝트 전환기 */}
      <ProjectSwitcher project={project} collapsed={collapsed} onBackToList={onBackToList}/>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "var(--db-radius-sm)", border: "none", cursor: "pointer", width: "100%",
                background: isActive ? "rgba(139,92,246,.18)" : "transparent",
                color: isActive ? "var(--db-purple-300)" : "var(--db-text-secondary)",
                fontWeight: isActive ? 700 : 500,
                fontSize: 14, transition: "var(--db-transition)",
                borderLeft: isActive && !collapsed ? "2px solid var(--db-purple-400)" : "2px solid transparent",
                boxShadow: isActive ? "var(--db-glow-sm)" : "none",
              }}
              title={collapsed ? item.label : ""}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--db-bg-elevated)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ fontSize: 17, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
              {isActive && !collapsed && (
                <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: "var(--db-purple-400)" }}/>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ padding: "10px 8px", borderTop: "1px solid var(--db-border)", display: "flex", flexDirection: "column", gap: 2 }}>
        {BOTTOM_NAV.map(item => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: collapsed ? "10px 0" : "10px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: "var(--db-radius-sm)", border: "none", cursor: "pointer", width: "100%",
              background: "transparent", color: "var(--db-text-muted)", fontSize: 14, transition: "var(--db-transition)",
            }}
            title={collapsed ? item.label : ""}
            onMouseEnter={e => e.currentTarget.style.color = "var(--db-text-secondary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--db-text-muted)"}
          >
            <span style={{ fontSize: 17, flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
          </button>
        ))}
        <button
          onClick={onToggle}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 9, borderRadius: "var(--db-radius-sm)",
            border: "1px solid var(--db-border)", cursor: "pointer",
            background: "var(--db-bg-elevated)", color: "var(--db-text-muted)",
            fontSize: 12, marginTop: 4, transition: "var(--db-transition)",
          }}
          title={collapsed ? "펼치기" : "접기"}
        >{collapsed ? "▶" : "◀"}</button>
      </div>
    </aside>
  );
}

/* ── Topbar ── */
function Topbar({ view, project }) {
  const { title, sub } = VIEW_TITLES[view] ?? VIEW_TITLES.overview;
  const meta = STATUS_META[project.status];

  return (
    <header style={{
      height: 60, padding: "0 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "var(--db-bg-surface)",
      borderBottom: "1px solid var(--db-border)", flexShrink: 0,
    }}>
      {/* 왼쪽: 뷰 제목 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--db-text-primary)" }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--db-text-muted)", marginTop: 1 }}>{sub}</div>
        </div>
        {/* 정합성 스코어 칩 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(139,92,246,.12)", border: "1px solid var(--db-border-mid)",
          borderRadius: 100, padding: "3px 10px", fontSize: 11, fontWeight: 700,
          color: "var(--db-purple-300)",
        }}>
          <span style={{ fontWeight: 900 }}>{project.score}</span>
          <span style={{ color: "var(--db-text-muted)" }}>/ 100</span>
          <span style={{ marginLeft: 2, color: meta.color, fontSize: 10, fontWeight: 700,
            background: meta.bg, borderRadius: 100, padding: "1px 6px" }}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* 오른쪽 */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "var(--db-bg-elevated)", border: "1px solid var(--db-border)",
          borderRadius: "var(--db-radius-sm)", padding: "6px 12px",
          color: "var(--db-text-muted)", fontSize: 12, cursor: "pointer",
        }}>
          <span>🔍</span><span>검색...</span>
          <span style={{ background: "var(--db-bg-surface)", borderRadius: 4, padding: "1px 5px", fontSize: 10 }}>⌘K</span>
        </div>
        <div style={{ position: "relative", cursor: "pointer" }}>
          <div style={{
            width: 34, height: 34, borderRadius: "var(--db-radius-sm)",
            background: "var(--db-bg-elevated)", border: "1px solid var(--db-border)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
          }}>🔔</div>
          <div style={{
            position: "absolute", top: -3, right: -3, width: 9, height: 9,
            borderRadius: "50%", background: "var(--db-purple-500)",
            border: "2px solid var(--db-bg-surface)",
          }}/>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "var(--db-grad-purple)", boxShadow: "var(--db-glow-sm)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "white", cursor: "pointer",
        }}>M</div>
      </div>
    </header>
  );
}

/* ── DashboardLayout (exported) ── */
export function DashboardLayout({ children, activeView, onViewChange, project, onBackToList }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="db-root" style={{ display: "flex", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Anti-Gravity background orbs */}
      <div className="db-orb db-orb-1" style={{ top: "-10%", left: "30%", zIndex: 0 }}/>
      <div className="db-orb db-orb-2" style={{ bottom: "10%", right: "5%", zIndex: 0 }}/>
      <div className="db-orb db-orb-3" style={{ top: "50%", left: "60%", zIndex: 0 }}/>

      <Sidebar
        active={activeView}
        onSelect={onViewChange}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        project={project}
        onBackToList={onBackToList}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>
        <Topbar view={activeView} project={project}/>
        <main style={{
          flex: 1, overflow: "auto", padding: 28,
          background: "linear-gradient(180deg, var(--db-bg-primary) 0%, var(--db-bg-base) 100%)",
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
